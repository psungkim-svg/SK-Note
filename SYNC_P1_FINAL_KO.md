# 방안 B 최종 설계 · 검증 보고 (SQL 미실행 · 코드 미수정)

작성일 2026-09-17 · 검증 도구: `review/pgtest/trigger_test.mjs`(실제 PostgreSQL 엔진 PGlite에서 트리거·CAS 실행), `review/syncdiag/p1_conflict_sim.js`(클라이언트 알고리즘 시뮬레이션)

---

## 1. 실 DB 확인용 읽기 전용 SQL (실행 준비 완료 — 결과를 보내 주세요)

Supabase → SQL Editor → New query에 **아래 전체를 한 번에** 붙여 실행하면 결과 탭이 6개 나옵니다. 어떤 것도 변경하지 않습니다.

```sql
-- Q1. notes/folders 컬럼·타입 (updated_at/created_at/remind_at/deleted/user_id/id/version/server_updated_at 확인)
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name in ('notes','folders')
order by table_name, ordinal_position;

-- Q2. PK / 제약
select conrelid::regclass as tbl, conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint
where connamespace='public'::regnamespace and conrelid::regclass::text in ('notes','folders');

-- Q3. 기존 트리거 (있으면 반드시 보고 — 새 트리거와 충돌 여부 검토)
select tgrelid::regclass as tbl, tgname, pg_get_triggerdef(oid) as def
from pg_trigger
where tgrelid in ('public.notes'::regclass,'public.folders'::regclass) and not tgisinternal;

-- Q4. RLS 활성화 + 정책
select relname, relrowsecurity, relforcerowsecurity from pg_class
where relnamespace='public'::regnamespace and relname in ('notes','folders');
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname='public';

-- Q5. Realtime publication
select * from pg_publication_tables where pubname='supabase_realtime';

-- Q6. 데이터 현황 (ms 정수인지: max가 1.7e12 근처면 ms)
select count(*) as total, count(*) filter (where deleted) as tombstones,
       count(distinct user_id) as users, min(updated_at), max(updated_at), min(created_at), max(created_at)
from public.notes;
```

**보고 시 특히 봐야 할 것**
- Q1 `updated_at`/`created_at` data_type = `bigint`(정상) / `timestamp with time zone`(→ 앱과 불일치, 별도 보고) / `numeric`·`double precision`(동작하나 권장 안 함)
- Q1 `remind_at` 유무·타입 → P7 결정
- Q1 `version`, `server_updated_at` 이미 있는지 → 있으면 아래 SQL의 `add column if not exists`가 건너뛰므로 **타입이 같은지** 확인 필요
- Q3 기존 트리거 → 이름이 `notes_touch`이면 아래 SQL이 교체하므로 **먼저 내용 검토**. 다른 이름이면 공존(둘 다 BEFORE면 이름 알파벳 순 실행)
- Q4 `relrowsecurity=true` + `own notes` 정책 존재 여부
- Q5 `notes` 포함 여부(Realtime 동작 조건)

---

## 2. 최종 SQL (방안 B) — 실행 보류, 승인 후 실행

```sql
-- soonenote sync v2: server-managed version / server_updated_at  (idempotent, 데이터 변경 없음)
alter table public.notes add column if not exists version bigint not null default 0;
alter table public.notes add column if not exists server_updated_at timestamptz not null default now();

create or replace function public.notes_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
  else
    new.version := coalesce(old.version, 0) + 1;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch
  before insert or update on public.notes
  for each row execute function public.notes_touch();

create index if not exists notes_user_srv_idx on public.notes (user_id, server_updated_at);
```
- 기존 row: `version=0`, `server_updated_at=now()`(추가 시점) — 내용·`updated_at` 등 **어떤 기존 컬럼도 건드리지 않음**. DELETE/INSERT/재생성 없음.
- `clock_timestamp()` 사용 이유: 한 트랜잭션 안에서 여러 row가 갱신돼도 커서가 겹치지 않게(`now()`는 트랜잭션 시작 시각으로 동일).
- RLS 정책은 그대로 적용됨(트리거는 정책 뒤에서 실행). 새 컬럼은 `select *`로 자동 포함.
- 되돌리기(필요 시): `drop trigger notes_touch on public.notes; drop function public.notes_touch(); alter table public.notes drop column version, drop column server_updated_at;` — 이것도 데이터 손실 없음.

### 트리거 동작 검증 (실제 PostgreSQL 엔진에서 실행한 결과)
| 케이스 | 결과 |
|---|---|
| 기존 데이터 3건에 SQL 적용 | 내용·`updated_at` 그대로, `version=0` 부여 |
| **구버전 앱의 조건 없는 `upsert`** | 정상 동작, 트리거가 `version 0→1` 증가 (구버전과 공존 가능; 단 구버전은 여전히 LWW라 그 기기가 남아 있는 동안 P1 보호는 그 기기엔 적용 안 됨) |
| INSERT | `version=1` |
| UPDATE | `version+1`, `server_updated_at` 갱신 |
| 신버전 CAS `update … where id=? and version=<base>` (base 일치) | 1행 갱신 |
| CAS base 불일치 | **0행, 서버 내용 미변경** → 충돌로 판정 |
| 새 노트 `insert … on conflict do nothing` 중복 id | 0행 → 클라이언트는 pull 후 CAS 경로로 전환(덮어쓰기 없음) |
| 클라이언트가 `version=999`를 보내도 | 트리거가 서버 값으로 덮음(조작 불가) |
| 커서 `server_updated_at > max` | 이후 변경만 반환 |
| tombstone(`deleted=true`) 후 구 base로 `deleted=false` 시도 | CAS 0행 → **부활 거부** |
| 기존 트리거 충돌 | 테스트 DB엔 없음. 실 DB는 Q3 결과로 확인 |

**트리거와 upsert/CAS 충돌 여부**: upsert(`on conflict do update`)도 내부적으로 UPDATE이므로 같은 BEFORE 트리거를 타며 version이 정상 증가합니다. CAS는 `where version=$base`가 트리거 **이전**에 평가되므로 서로 간섭하지 않습니다(검증 [3][4]).

---

## 3. 클라이언트 알고리즘(최종) 및 요구 시나리오 검증

로컬 노트에 추가되는 필드(localStorage만): `syncBase`(마지막 일치 시점 서버 version, 0=서버에 없음), `conflictKey`(사본에만).

```
push(dirty 노트마다):
  base==0 → insert … on conflict do nothing … select(version)
            0행이면(이미 있음) → 서버 row 받아 충돌 처리로
  base>0  → update … eq(id) eq(version, base) … select(version)
            1행: dirty=false, base=새 version
            0행: 서버 row 조회(select) →
                 내용이 같음: base만 갱신(사본 없음)
                 다름: 내 내용 → 새 노트 "제목 [충돌 사본 · 이 기기]" (id 새로, base 0, conflictKey=원본id@서버version@기기)
                       원본 ← 서버 내용, base=서버 version, dirty=false
                       토스트 1회. 사본은 같은 push 사이클에서 insert.
pull(cursor = 마지막으로 받은 max(server_updated_at)):
  select … eq(user_id) gt(server_updated_at, cursor) order(server_updated_at)
  로컬 없음 → 추가
  로컬 dirty → 건드리지 않음 (push의 CAS가 판정)
  로컬 clean & version≠base → 반영(편집기 열려 있으면 P2 규칙)
```

### 요구 시나리오: A·B 모두 동기화된 뒤 **둘 다 오프라인 수정** → A 복귀 sync → B 복귀 sync
| 항목 | 결과 |
|---|---|
| 서버 최종 | `n1(v2)=A offline edit` + `c1(v1)=B offline edit [충돌 사본 · B]` |
| A 최종 / B 최종 | 동일 2건 (수렴 O) |
| A 편집 보존 / B 편집 보존 | O / O |
| 사본 개수 | 정확히 1 (중복 없음) |
| 추가 sync 20회 후 서버 row 수 | 2 → 2 (**무한 루프·재사본 없음**; `conflictKey`로 같은 충돌 재생성 차단, 사본은 base 0 insert라 재충돌 불가) |
| 3자 시나리오(C가 먼저 바꾼 뒤 A·B 오프라인 편집) | C·A·B 편집 모두 보존, A=B=C 수렴 |

"서버의 최초 내용(ORIGINAL)"에 대해 정직하게: A가 온라인 복귀해 올린 첫 편집은 base가 서버 version과 일치하므로 **정상적인 순차 편집**으로 ORIGINAL을 대체합니다(한 기기에서 편집한 것과 동일). 이는 충돌이 아니며 "조용한 소실"이 아닙니다. 만약 ORIGINAL까지 항상 남기길 원하시면 노트 히스토리 기능이 필요하므로 별도 범위입니다.

### P2 (편집기 열린 상태) 규칙 — 같은 원칙
- 수신 노트 == `ui.editingId`:
  - `edSnapshot()===ui._edSnap`(사용자 미수정) → 제목/본문 DOM 갱신 + 스냅샷 재설정 + 작은 안내 "다른 기기의 변경을 반영했습니다".
  - 사용자 수정 중 → DOM/모델 모두 그대로(dirty 유지), 편집기 상단에 띠 "이 노트가 다른 기기에서 변경되었습니다" + [내 내용 유지(저장 시 충돌 사본 규칙 적용)] [다른 기기 내용 보기] [다시 불러오기(내 내용은 사본으로 보관 후 서버 내용 로드)]. 자동 덮어쓰기 없음. 어느 선택이든 두 내용 모두 보존.

---

## 4. 다음 단계
1. 위 §1 SQL 결과(Q1~Q6) + 프로젝트 Active 여부 회신.
2. 결과 검토 후(특히 Q1 타입, Q3 기존 트리거) §2 SQL 실행 승인 요청.
3. 승인 후 코드 수정: P1 → P2 → P4 → P6 (각 단계 모의 서버 = 위 트리거 규칙 그대로 구현하여 18개 테스트 + 시계 시나리오).
