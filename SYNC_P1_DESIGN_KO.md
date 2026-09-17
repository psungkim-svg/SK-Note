# P1 최종 설계안 · DB 확인 결과 (승인 요청 — 코드 미수정)

작성일: 2026-09-17 · 대상 v7.7.0 · 시뮬레이션: `review/syncdiag/p1_policy_sim.js`

## STEP 1. 현재 코드/DB 구조 재확인

**코드(확정)**
- `toRow()`: `updated_at = n.updatedAt` (기기 `Date.now()` ms 정수), `created_at` 동일. `remind_at` 미전송, `locked:false` 고정 전송.
- `pushDirty()`: `notes.upsert(rows)` 조건 없음. `folders.upsert({id,user_id,name,created_at})`.
- `pullAll()`: `gt('updated_at', lastPull-60000)` — `lastPull = Date.now()`(기기 시계). 병합: `server.updatedAt >= local.updatedAt`이면 덮어씀(dirty 여부 무시).
- `subscribe()`: Realtime 수신도 같은 병합 규칙.
- `hardDelete()`: 서버 row 물리 삭제, 오류 무시.

**DB(코드에서 역추정 — 실제 확인 필요)**
| 항목 | 코드가 가정하는 값 | 근거 |
|---|---|---|
| PK | `id text` (앱 uid 'n…' 문자열) | `toRow.id`, `.eq('id',id)` |
| `user_id` | `uuid` = `auth.uid()` | RLS_SQL |
| `updated_at`, `created_at` | **`bigint`(ms)** 이어야 함 | 정수를 그대로 upsert·`gt()` 비교. `timestamptz`라면 `gt('updated_at', 1789…)`가 22008 오류 → pull 전부 실패했을 것이므로, 지금 "동기화가 돌아간다"는 사실 자체가 bigint(또는 numeric) 증거 |
| `deleted boolean` | 있음 | tombstone 방식 이미 사용 |
| `remind_at` | **불명** | fromRow만 읽음(없으면 undefined→0, 오류 없음) |
| `locked`, `items jsonb`, `sort_index`, `color`, `type`, `folder`, `title`, `content` | 있음(upsert에 포함 → 없으면 42703 오류로 push 전부 실패) | |
| RLS / Realtime | 앱이 강제하지 않음 | RLS는 안내 SQL만 제공 |

이 환경에서는 Supabase에 접근할 수 없습니다. **아래 SQL을 Supabase → SQL Editor에서 실행해 결과를 보내 주세요** (읽기 전용, 변경 없음):

```sql
-- 1) notes/folders 컬럼과 타입
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name in ('notes','folders')
order by table_name, ordinal_position;
-- 2) PK/제약
select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid)
from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text in ('notes','folders');
-- 3) RLS 켜짐 여부 + 정책
select relname, relrowsecurity from pg_class where relname in ('notes','folders');
select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public';
-- 4) Realtime publication 포함 여부
select * from pg_publication_tables where pubname='supabase_realtime';
-- 5) 내 데이터 상태(개수, 삭제표시, updated_at 범위 — ms인지 확인)
select count(*), count(*) filter (where deleted) as tomb, min(updated_at), max(updated_at) from notes;
```
프로젝트 Active 여부: 대시보드 홈에서 "Paused" 배너 유무로 확인 부탁드립니다(위 SQL이 실행되면 Active).

---

## STEP 2. P1 설계 비교 (시뮬레이션 결과)

요구 시나리오: A 정상, B 시계 −10분 / +1시간 / −1시간. ① A 수정·동기화 → ② B **오프라인**에서 같은 노트 수정(실제 시각상 더 최신) → ③ B 복귀 → ④ 양쪽 sync 2회.

| 정책 | B −10분 | B +1시간 | B −1시간 | 시계 동일 |
|---|---|---|---|---|
| **현재 코드** | 수렴 ✗, **B의 최신 편집 소실** | 수렴 O, A 편집은 조용히 덮임 | 수렴 ✗, **B 최신 소실** | 수렴 O, A 편집 조용히 덮임 |
| **E1(진단서 원안: 오래된 row 받으면 dirty 재업로드)** | 수렴 ✗, **B 최신 소실** | 수렴 O, A 덮임 | 수렴 ✗, **B 최신 소실** | 수렴 O, A 덮임 |
| **서버 순서 + 조건부 쓰기(CAS) + 충돌 사본** | 수렴 O, **둘 다 보존** | 수렴 O, 둘 다 보존 | 수렴 O, 둘 다 보존 | 수렴 O, 둘 다 보존 |

→ **E1 원안은 폐기**합니다(시계가 느린 기기의 오프라인 편집을 여전히 잃음). 핵심은 "타임스탬프로 승자를 고르는 것" 자체가 문제이므로, **덮어쓰기 전에 '내가 마지막으로 본 서버 상태'와 같은지 확인(CAS)하고, 다르면 조용히 덮지 않고 두 내용을 모두 남기는 것**이 유일하게 무손실입니다.

### 공통 규칙(두 방안 동일)
1. 각 노트에 로컬 전용 `syncBase`(마지막으로 서버와 일치했을 때의 서버 기준값)를 저장 — **localStorage 필드 추가만, 서버 스키마 무관**.
2. push: `update … eq(id) eq(<기준컬럼>, syncBase)` → 영향 0행이면 **충돌**. 새 노트는 `insert`.
3. 충돌 시: 서버 내용을 원본 노트에 받고, **내 내용은 "제목 (충돌 사본 · 이 기기)" 노트로 새 id 생성해 보존** → 즉시 push. 사용자에게 토스트 1회. 어느 쪽도 사라지지 않음.
4. pull: 로컬이 `dirty`인 노트는 **덮지 않음**(push의 CAS가 해결). dirty가 아니면 서버 기준값이 `syncBase`와 다를 때만 반영.
5. 정렬/표시용 `updatedAt`은 그대로 기기 시계(UI용). 승자 판정에는 더 이상 쓰지 않음.

### 방안 A — 스키마 변경 없음
- 기준컬럼 = 기존 `updated_at`(bigint). CAS: `update().eq('id').eq('updated_at', syncBase).select('id')`.
- 시계 보정: supabase-js가 쓰는 `fetch`를 감싸 **응답의 `Date` 헤더**로 서버-기기 시계 오프셋을 계산(추가 호출 0회) → 올리는 `updated_at = Date.now()+offset`. 오프라인 편집도 마지막 오프셋으로 보정.
- P4 커서: 받은 row의 `max(updated_at)`(보정된 값).
- 남는 위험: ① 두 기기가 **정확히 같은 ms**로 쓰면 CAS를 통과(확률 극히 낮음; 저장 시 ms에 기기별 0–999µs 대신 `updated_at`을 "이전 서버값+1 이상"으로 강제해 완화). ② 오프라인 중 기기 시계를 손으로 바꾼 경우 커서 누락 가능(60초 여유 유지 + 로컬 dirty 우선으로 손실은 없음, 늦게 받을 뿐).
- 필요 작업: 앱만 수정. SQL 없음.

### 방안 B — 스키마 변경(권장)
```sql
alter table public.notes add column if not exists version bigint not null default 0;
alter table public.notes add column if not exists server_updated_at timestamptz not null default now();
create or replace function public.notes_touch() returns trigger language plpgsql as $$
begin new.version := coalesce(old.version,0)+1; new.server_updated_at := now(); return new; end $$;
drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before insert or update on public.notes for each row execute function public.notes_touch();
create index if not exists notes_user_srv_idx on public.notes(user_id, server_updated_at);
```
- 기준컬럼 = `version`(서버 트리거가 증가, 클라이언트 조작 불가). CAS: `eq('version', syncBase)`.
- P4 커서 = `max(server_updated_at)`(서버 시계, 기기 시계 완전 무관).
- 남는 위험: 사실상 없음(서버가 단일 순서를 보장). 기존 row는 `version=0`으로 시작하므로 기존 데이터 영향 없음. 앱 구버전이 upsert해도 트리거가 version을 올려 호환.
- 필요 작업: 위 SQL 1회 + 앱 수정. **컬럼이 없으면** 앱은 push 시 42703 오류 → "동기화 설정 SQL을 실행하세요" 안내(P6 경로)로 표시하고 **로컬 데이터는 그대로**.

### 선택
**방안 B를 권장**합니다(시계·ms 충돌 위험 0, P4까지 서버 기준). 이미 RLS SQL을 실행하신 경로와 같아 부담이 작습니다. SQL 실행이 어려우시면 방안 A로 진행 가능하며, 손실 위험은 "동일 ms 충돌"뿐입니다.

---

## STEP 3 예정 범위(승인 후, 1차)
- **P1**: 위 방안(B 또는 A). `toRow/pushDirty/pullAll/subscribe` + 로컬 `syncBase` 필드.
- **P2**: 수신 노트가 편집 중(`ui.editingId`)일 때 — 편집기 스냅샷 변화 없음(`edSnapshot()===ui._edSnap`)이면 편집기에 **안전 반영**(제목/본문 갱신 + 스냅샷 재설정); 변화가 있으면 덮지 않고 상단에 "이 노트가 다른 기기에서 변경되었습니다" 띠 + [내 내용 유지] [다른 기기 내용 보기] [다시 불러오기(내 내용은 사본으로 보관)].
- **P4**: 커서 = 서버가 준 최대값(B: `server_updated_at`, A: `updated_at`), 저장 위치 `settings.lastPull` 그대로(의미만 변경, 첫 실행 시 1회 전체 pull).
- **P6**: 상태 머신(`ok/err/nosession/offline`)에서 **상태가 바뀔 때 1회 + 같은 상태면 24시간 1회** 토스트, 설정→계정 배지. dirty 개수 표시("올리지 못한 노트 3개"). 로컬 삭제 없음.
- 이후 STEP 5: P3(영구 삭제 = `deleted:true` tombstone, 30일 후 서버 purge; 부활 방지: tombstone보다 낮은 version/base의 upsert는 CAS로 거부), P5(성공 = push CAS 전부 통과 **and** pull 완료 **and** dirty 0; 추가 호출 없음 — `update().select('id')` 응답 행수로 검증). STEP 6 P7(DB 결과 후). STEP 7 E7(purge 하루 1회).

## 테스트 계획(수정 후, 모의 서버에 트리거 동작 포함해 재구현)
요구 18항목 전부 + 위 4개 시계 시나리오 × 오프라인 편집. 합격 기준: 어떤 시나리오에서도 "사라진 내용" 0, 정상 동기화 후 A=B(id·제목·본문·폴더·색·정렬 필드).

**승인 요청 사항**: ① 방안 B(SQL 1회) / 방안 A(스키마 무변경) 중 선택 ② 위 SQL(읽기 전용) 실행 결과 ③ 프로젝트 Active 여부.
