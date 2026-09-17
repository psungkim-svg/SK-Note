# soonenote — Supabase 양방향 동기화 정밀 진단 보고서

작성일: 2026-09-16 · 대상: `fix_v7.5.1/index.html` (v7.6.8) · **코드는 수정하지 않았습니다.**

진단 방법
1. `index.html` 전체에서 Supabase/동기화 관련 코드(SYNC 객체, syncSoon/syncNow, dirty 플래그, hardDelete, 타이머·이벤트)를 전수 추적.
2. 실제 Supabase 계정 정보는 이 환경에 없으므로, 앱이 쓰는 supabase-js 호출 부분집합(`from().select/upsert/delete/eq/gt/lt/in/order/limit`, `auth.getSession`, `channel`)을 그대로 흉내 내는 **공유 모의 서버**(`review/syncdiag/mock_server.js`)를 띄우고, 브라우저 컨텍스트 2개(기기 A·B)로 **앱의 실제 동기화 코드를 그대로 실행**하며 요청 로그와 양쪽 localStorage를 비교했습니다(`review/syncdiag/run_tests.js`, 결과 `results.json`).
   - 한계: RLS·실제 서버 시계·Realtime 전달은 모의 서버가 재현하지 못함(해당 항목은 코드 근거로 판단).

---

## A. 현재 동기화 구조 (실제 함수명 기준)

```
[기기 A 로컬]                                   [Supabase]                          [기기 B 로컬]
편집/생성/삭제 → n.updatedAt=Date.now(); n.dirty=true
   → persistActive()/save()  (localStorage sk.notes)
   → syncSoon()  (2.5초 디바운스)
        └ SYNC.pushDirty()
            notes.upsert(dirty 전부, toRow)  ─────────▶  notes 테이블 (id PK, user_id, updated_at=클라이언트 ms 정수)
            folders.upsert / folders.delete
            성공 시 n.dirty=false, lastSync 갱신, setStatus('ok')
                                                                                   syncNow() (시작 1.5초 후 / 포커스 / 가시화 / 온라인 / 60초 주기 / 점 클릭)
                                                                                     ├ SYNC.pushDirty()
                                                                                     └ SYNC.pullAll()
                                                        notes.select('*').eq(user_id).gt(updated_at, lastPull-60s).limit(5000) ◀──
                                                        folders.select('*').eq(user_id).limit(500)
                                                                                         없는 id → push / 있는 id → 서버 updatedAt >= 로컬이면 덮어씀
                                                                                         save(); 편집기 닫혀 있을 때만 render(); setStatus('ok')
영구 삭제 → SYNC.hardDelete(id) → notes.delete().eq(user_id).eq(id)  (fire-and-forget)
Realtime: SYNC.subscribe() → channel('sk-realtime-'+uid).on(postgres_changes notes/folders, filter user_id)
```

- 세션: `SYNC.restore()`(load 후) → `auth.getSession()` → `onAuth()` → `pushDirty().then(pullAll)` + `subscribe()`.
- 로컬 저장은 항상 먼저 일어나고(`save()`), 서버 호출은 그 뒤에 비동기로 일어남. 로컬 저장 실패 경로와 서버 실패 경로는 분리되어 있음.
- Vault 노트는 동기화 대상이 아님(`if(!ui.vault)syncSoon()` / `NOTES()` 분기). 정상 설계.

### 4-A 업로드 검증 (코드)
| 항목 | 결과 |
|---|---|
| 1 로컬 저장 | O — `persistActive()`→`save()` (모든 변경 지점에서 `dirty=true`와 함께) |
| 2 실제 요청 | O — `syncSoon()` 2.5초 후 `pushDirty()`; 단, **세션이 없으면 조용히 return** (`if(!c||!this.session)return`) |
| 3 방식 | `upsert` (id PK 기준, 조건 없음) |
| 4 성공 판정 | `{error}`가 null이면 성공 → `dirty=false` |
| 5 row 생성 확인 | 모의 서버 T1/T2 PASS. 실제 서버에서도 RLS `with check (auth.uid()=user_id)` 충족 시 생성됨 |
| 6 에러 은폐 | **있음** — ① `hardDelete`/`deleteFolder`/30일 정리 delete는 `.then(()=>{},()=>{})`로 오류 무시 ② `subscribe()` 실패는 try/catch로 무시(의도) ③ `pushDirty` 실패는 `setStatus('err')`로 점 색만 빨강, 토스트 없음 → 사용자는 거의 모름 |

### 4-B 다운로드 검증 (코드)
| 항목 | 결과 |
|---|---|
| 1 select 발생 | O — `pullAll()` |
| 2 올바른 사용자 | O — `.eq('user_id', this.uid)` + RLS |
| 3 모든 노트 | **조건부** — 로컬에 노트가 1개라도 있으면 `updated_at > lastPull-60s` 증분만. `lastPull`은 **클라이언트 시계** |
| 4 limit | 5000 (증분이라 실사용에선 충분). folders 500 |
| 5 로컬 반영 | O — `S.notes` 병합 후 `save()` |
| 6 재렌더 | **조건부** — `if(!$('#edOverlay').classList.contains('show'))render();` 편집기가 열려 있으면 화면·편집기 모두 갱신 안 됨 |

### 4-C 노트 ID
- `uid()` = `'n'+Date.now().toString(36)+random(5)` — 기기별 생성, 서버 id 컬럼에 그대로 upsert. 같은 노트는 양 기기에서 **같은 id**를 가짐(T1 확인: A/B id 동일). 중복 노트 문제 없음.
- 예외: "복사"(`4770`, `5046` `id:uid()`)는 의도적으로 새 노트. Vault 이동은 로컬 전용.

---

## B. 발견된 문제 (심각도 순)

### P1 — 시계 기준 Last-Writer-Wins + 무조건 upsert → 기기 시계가 다르면 **최신 편집이 영구 유실**
- 발생 조건: 두 기기의 시계 차이(수 분 이상) 또는 시계 자동설정 꺼짐/여행 후 시간대 오류. 오프라인 편집 후 나중에 올릴 때도 동일.
- 원인: `toRow()`가 `updated_at=n.updatedAt`(클라이언트 `Date.now()`, ms 정수)를 그대로 올리고 서버는 조건 없이 덮어씀(`upsert`). 받는 쪽은 `sn.updatedAt>=(local.updatedAt||0)`으로만 판정. 서버 시각(`now()`) 사용 없음, 버전 번호 없음.
- 실측(T6): A 시계를 10분 늦춘 뒤 A에서 최신 편집 → 서버 row는 A 내용으로 덮이지만 `updated_at`이 **과거로 후퇴**. B는 자기 값이 더 새롭다고 판단해 무시 → **A와 B가 영구히 다른 내용**(사용자가 보고한 "동기화는 도는데 내용이 안 맞음"과 정확히 일치). 이후 B가 어떤 사소한 변경(색·정렬)만 해도 서버·A가 B 것으로 덮여 A의 최신 편집 소실.
- 파일/함수: `index.html` `SYNC.toRow`, `SYNC.pushDirty`, `SYNC.pullAll`, `SYNC.subscribe`
- 심각도: **높음** · 데이터 손실: **있음**

### P2 — 편집기가 열린 동안 pull이 들어오면 모델만 바뀌고 편집기는 옛 내용 → 저장 시 **상대 기기 변경을 덮어씀(lost update)**
- 발생 조건: B가 노트를 열어 둔 채(자동 60초 pull, 포커스 복귀 pull 포함) A가 같은 노트를 수정.
- 원인: `pullAll`/`subscribe`가 `S.notes`를 갱신하지만 `render()`는 `#edOverlay`가 닫힌 경우에만; 편집기 DOM(`#edBody`, `#edTitle`)은 갱신하지 않음. 이후 `flushEd()`는 편집기 DOM을 `n.content`로 저장(`updatedAt=now`, `dirty=true`) → A의 변경이 서버에서 사라짐.
- 실측(T3b): 재현됨. 서버 최종 내용 = B 편집기 내용, A의 변경 소실.
- 파일/함수: `pullAll`, `subscribe`, `flushEd`, `openEditor`
- 심각도: **높음** · 데이터 손실: **있음**(폰과 태블릿을 동시에 켜두는 사용 패턴에서 흔함)

### P3 — 영구 삭제(hard delete)는 다른 기기에 전달되지 않음(Realtime이 안 될 때)
- 발생 조건: A에서 휴지통 비우기/영구 삭제, B가 그 순간 Realtime 연결이 아님(앱 백그라운드, Realtime 미활성, 채널 오류).
- 원인: `SYNC.hardDelete`는 서버 row를 지움 → `pullAll`은 "존재하는 row"만 받으므로 삭제 사실을 알 길이 없음. B에 row가 남아 있다가 B가 그 노트를 조금이라도 건드리면 `dirty`로 다시 upsert → **삭제한 노트가 부활**.
- 실측(T4): 소프트 삭제(휴지통)는 A↔B 정상 전파(PASS). 하드 삭제는 B에 그대로 남음(PASS = 문제 재현).
- 파일/함수: `SYNC.hardDelete`, `pullAll`, 3622/3646/5052/5065 호출부, 30일 자동 정리(3642–3648, `pullAll` 내부 `delete().lt('updated_at',cutoff)`)
- 심각도: 중간 · 데이터 손실: 없음(반대로 삭제가 안 됨). 단 30일 정리와 결합 시 "지웠는데 다시 나타남".

### P4 — 증분 pull 기준(`lastPull`)이 클라이언트 시계 → 시계가 앞서 있던 기기는 이후 상대 변경을 **영영 못 받음**
- 발생 조건: 기기 시계가 잠시 미래로 갔다가 정상으로 돌아옴(수동 설정, 시간대 오류). `lastPull`이 미래값으로 저장됨.
- 원인: `since=S.settings.lastPull||0` 후 `gt('updated_at', since-60000)`. 상대 기기가 올린 `updated_at`(정상 시각)이 since보다 작으면 걸러짐. 로컬 노트가 0개일 때만 전체 pull.
- 심각도: 중간 · 데이터 손실: 직접 없음(내려받기 누락 → 결과적으로 P1 경로로 손실 가능)
- 완화 수단: 현재 없음(사용자가 앱 데이터 삭제 시에만 전체 pull).

### P5 — "동기화됨" 표시는 요청 성공만 의미, 데이터 검증 없음
- `pushDirty` 성공 = `upsert` 응답 error 없음 → `setStatus('ok')`. RLS로 인해 0행 처리된 경우에도 supabase-js는 error 없이 반환하므로(예: `user_id` 불일치) **"동기화됨"이지만 서버에 저장 안 됨**이 가능. 실패 시에도 토스트 없이 점 색만 변경(`setStatus('err')`).
- `syncNow()`는 `pushDirty`가 `busy`면 `pending`으로 미루고 바로 `pullAll`을 실행 → 순서가 "올리기→내려받기"가 보장되지 않는 경우가 있음(`busy` 중첩 시).
- 심각도: 중간(진단을 어렵게 함)

### P6 — 세션 만료/미복원 시 조용히 아무것도 안 함
- `pushDirty`/`pullAll`/`syncNow` 모두 `!this.session`이면 return. 토큰 갱신 실패(`SIGNED_OUT`, 장기 미사용, 프로젝트 Pause)가 나면 `onAuth(null)` → `미로그인` 상태 문구만 바뀌고, 사용자가 설정 화면을 열어야 알 수 있음. 편집은 계속 `dirty`로 쌓이지만 업로드되지 않음 → 다른 기기와 불일치.
- 심각도: 중간 · Supabase가 Pause되면 이 경로로 **양쪽 모두 조용히 동기화 중단**.

### P7 — 스키마 불일치 후보(확인 필요)
- `fromRow`는 `r.remind_at`을 읽지만 `toRow`는 `remind_at`을 올리지 않음 → 알림 시각은 동기화되지 않음(기기 간 차이 원인 중 하나, 손실은 아님).
- `updated_at`/`created_at`은 ms 정수. 테이블 컬럼이 `timestamptz`라면 `gt('updated_at', 1789609889191)`가 서버 오류(22008) → `불러오기 실패`로 pull 전부 실패. 컬럼이 `bigint`여야 함. **현재 테이블 DDL이 저장소에 없어 확인 불가 — 실제 Supabase 대시보드에서 컬럼 타입 확인 필요.**
- `folders.upsert`에 `updated_at` 없음(정상), `locked:false` 고정 컬럼 존재 가정.

### 보안 검토(10항)
- RLS: 앱은 안내 SQL(`RLS_SQL`)만 제공하고 **적용 여부를 강제하지 않음**. `SYNC.test()`가 로그아웃 상태에서 select가 되면 경고를 덧붙임(좋음). RLS가 꺼져 있으면 anon key만으로 전 사용자 read/delete 가능 — 앱 자체 필터(`eq('user_id')`)는 보안 경계가 아님.
- 로그아웃: `signOut` 후 `SYNC.reset()`; 로컬 노트는 그대로 남음(기기 공유 시 주의, 설계상 오프라인 우선이므로 허용 가능).
- 다른 사용자 노트 조회: RLS가 켜져 있으면 불가. 꺼져 있어도 앱은 `user_id` 필터를 걸지만 키를 가진 제3자는 우회 가능.
- 잘못된 upsert로 덮어쓰기: **P1/P2가 바로 그 경로.** 로컬 최신 노트가 서버의 오래된 데이터로 덮이는 경로 = P1(T6 3단계: 시계 늦은 기기가 상대 row를 받아 자기 최신 편집을 잃음 — 모의 실행에서는 서버 row가 이미 A 내용이라 미재현이었지만, B가 이후 한 번이라도 변경하면 발생).

---

## C. 실제 테스트 결과 (모의 서버 + 실제 앱 코드, 브라우저 2개)

| 테스트 | 결과 | 비고 |
|---|---|---|
| A → Supabase | **PASS** | 2.5초 후 upsert, dirty 해제 |
| Supabase → B | **PASS** | 같은 id/제목/본문/updatedAt |
| B → Supabase | **PASS** | |
| Supabase → A | **PASS** | |
| 수정 동기화 | **PASS / FAIL** | 편집기 닫힘: 양방향 PASS. **편집기 열림 중 수신: FAIL(P2, 상대 변경 소실)** |
| 삭제 동기화 | **PASS / FAIL** | 휴지통(soft): 양방향 PASS. **영구 삭제: FAIL(P3, B에 잔존)** |
| 충돌 처리 | **PASS(정책) / FAIL(시계)** | 정책 = 클라이언트 시계 LWW, 동일 시계면 수렴. **시계 10분 차이: FAIL — 영구 불일치(P1)** |

호출 로그(약 30초 실행, 기기당): select 13회(notes)+13회(folders), delete 13~14회(30일 정리 — **pull마다 1회 발생**), upsert 5~7회.

---

## D. Supabase "inactive" 이메일과의 관계

코드상 서버 호출 시점: 앱 시작 1.5초 후, 창 포커스/가시화, 온라인 복귀, 60초 주기(화면 켜져 있을 때만), 저장 후 2.5초, 점 클릭, 로그인/로그아웃. **즉 로그인 세션이 살아 있는 기기에서 앱을 열기만 해도 호출은 발생합니다.** 따라서 7일 이상 활동이 없다고 판정된 원인은 코드 결함보다 다음 중 하나일 가능성이 큽니다.
1. 어느 기기에서도 **세션이 유효하지 않음**(P6): refresh token 만료(기본 로그인 후 장기간 미사용, 또는 한 기기에서 로그아웃하면 다른 기기의 refresh 재사용 감지로 함께 무효화될 수 있음) → 모든 호출이 `!this.session`으로 조용히 건너뜀. 앱은 잘 쓰고 있어도 Supabase 입장에선 요청 0건.
2. 사용 중인 기기가 **Vault만** 쓰거나, 노트 앱을 PWA로 백그라운드에 두어 `visibilitychange`가 오지 않음(Android WebView/Capacitor는 60초 타이머가 백그라운드에서 정지).
3. 무료 플랜 "activity"는 DB/API 요청 기준이며, 사용자의 로컬 편집(오프라인 우선 구조)은 서버에 닿지 않는 한 활동으로 집계되지 않음.

즉 "앱을 쓰는데 inactive"는 **P6(조용한 세션 상실)**과 강하게 연결됩니다. 이메일 자체는 앱 결함의 증거가 아니며, 프로젝트가 Pause되면 모든 요청이 실패해 P6 경로로 동기화가 완전히 멈춥니다(점만 빨강).

권장 즉시 조치(코드 아님): Supabase 대시보드에서 프로젝트를 한 번 열어 Pause 방지, 각 기기의 설정→계정에서 로그인 상태 확인.

---

## E. 최소 수정 계획 (아직 미적용 · 승인 후 진행)

| # | 수정 | 파일/함수 | 내용 | 기존 기능 영향 | 데이터 손실 위험 | 테스트 |
|---|---|---|---|---|---|---|
| E1 (P1) | 서버 시각 기준 정렬 + 안전한 조건부 덮어쓰기 | `SYNC.toRow`, `pullAll`, `subscribe`, `pushDirty` | ① 로컬 `updatedAt`은 그대로 두되, 앱 시작 시 서버 시각 오프셋 1회 측정(`select now()` 대신 응답 `Date` 헤더 또는 경량 RPC 없이 **`upsert` 응답 row의 서버 트리거 컬럼 사용**은 DDL 변경이라 제외) → 대안: **pull 시 `updated_at`이 로컬보다 오래된 row를 받으면 무시하지 말고 '충돌 사본'을 만들지 않고, 대신 로컬 dirty를 다시 세워 즉시 재업로드**(양쪽이 반드시 같은 값으로 수렴). ② push 시 `updated_at`이 `Date.now()`보다 미래이면 now로 보정 | 없음(스키마 불변) | 낮음 — 수렴 규칙이 "가장 최근에 push한 쪽"으로 명확해짐. 진짜 동시 편집은 여전히 한쪽이 짐(현재와 동일) | T5/T6 재실행: 시계 차이 있어도 A=B 수렴 |
| E2 (P2) | 편집기 열린 노트에 수신 반영 | `pullAll`, `subscribe` | 수신 노트 id가 `ui.editingId`이고 로컬이 dirty가 아니면 `#edTitle/#edBody`를 갱신하고 `ui._edSnap` 재설정; 로컬이 dirty(입력 중)면 수신을 보류하고 다음 pull에서 처리 | 편집 중 화면이 바뀔 수 있음(상대 기기 수정 반영 — 사용자 설명 필요) | 낮음(현재는 손실, 수정 후 보존) | T3b: A 변경이 B 편집기에 반영되고 서버에 보존 |
| E3 (P3) | 영구 삭제도 tombstone으로 | `hardDelete` 호출부 3622/3646/5052/5065 | 서버 row를 지우지 않고 `deleted:true, updated_at:now` upsert 후 로컬에서만 제거(30일 정리는 그대로 서버에서 삭제) | 서버에 30일간 삭제 표시 row 유지(현재 휴지통과 동일) | 없음 | T4: 영구 삭제가 B에서도 사라짐 |
| E4 (P4) | 증분 기준을 서버가 준 최대 `updated_at`으로 | `pullAll` | `lastPull=Date.now()` → 받은 row 중 최대 `updated_at`(없으면 기존값). 미래 시계 영향 제거 | 없음 | 없음 | 시계 +1h 기기 시나리오 |
| E5 (P5/P6) | 실패·미로그인을 사용자에게 알림 | `setStatus`, `pushDirty`, `onAuth` | dirty가 남아 있는데 세션이 없거나 err면 하루 1회 토스트 + 설정 화면 배지; upsert 후 `select('id').in(ids)`로 저장 확인(선택) | 알림 1개 추가 | 없음 | 세션 제거 후 편집 → 안내 표시 |
| E6 (P7) | `remind_at` 업로드 | `toRow` | `remind_at:n.remindAt||0` 추가 — **단, 테이블에 컬럼이 없으면 upsert 전체 실패**하므로 대시보드 확인 후 적용 | 알림 시각 동기화 | 없음 | 알림 설정 A→B |
| E7 | 30일 정리 delete를 pull마다 → 하루 1회 | `pullAll` | `lastPurge` 설정값으로 제한 | 없음 | 없음 | 호출 로그 감소 |

적용 전 **사용자 확인 필요 사항**
1. Supabase 대시보드: `notes.updated_at`/`created_at` 컬럼 타입(`bigint`인지), `remind_at` 컬럼 존재 여부, Realtime이 `notes`에 켜져 있는지, RLS 정책 적용 여부(설정→"보안(RLS) 설정 SQL 보기"로 실행했는지).
2. 두 기기 모두 설정→계정·동기화에서 "로그인됨"인지(P6 확인). 하나라도 "미로그인"이면 그것이 현재 불일치의 직접 원인일 가능성이 가장 큼.
3. 두 기기의 시계(자동 설정) 확인.
