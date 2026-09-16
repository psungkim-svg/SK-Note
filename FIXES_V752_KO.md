# soonenote v7.5.2 — 사용자 피드백 4건 반영 내역 (FIXES)

**작성일:** 2026-09-12
**기준:** `fix_v7.5.1/` (v7.5.1 완성본) → v7.5.2
**범위:** `index.html` (Back 아키텍처 재구성, Vault 잠금 경계, 글자 굵기 3단계, 메뉴 닫기) · `sw.js` (VERSION) · `README_KO.md` · `SECURITY_NOTES_KO.md` · `DEPLOYMENT_HEADERS.txt` (CSP 해시) · 버전 7.5.1 → **7.5.2**
**검증:** Playwright 실제 브라우저 E2E **75개 체크 전부 통과** (폴더/보관 폴더 Back, 빠른 2연타, 저장 대기 Back, select/move/trash slot, ⋮ 메뉴 Back+배경 탭, Vault warm session 10케이스, 글자 굵기 3단계+이관) + VM 유닛 해르네스 **30개 체크 전부 통과** + `node --check` + CSP 해시 재계산 일치 + `sha256sum -c` 전체 통과

---

## 요청 1 — 폴더 Back: "폴더로 나온 후 그대로 닫혀"

**확인 (repro):**
- 재현 스크립트(Playwright)로 `폴더 hub → 상세 → 노트 → 텍스트 입력 → Back×3` 시퀀스를 클린 환경에서 실행하면 논리적으로는 정확히 `상세 → hub → main`으로 내려왔습니다. 즉 코드의 의도는 맞지만, 실제 기기에서 어긋나는 **구조적 취약점**이 원인이었습니다.
- 취약점: 기존 popstate 핸들러가 `history.pushState()`를 **핸들러 안에서** 호출해 history slot 수를 재보전하고 있었습니다(`if(hasSomethingToClose()) histPush()`, 폴더 하위 페이지에서 `folderHubBack();histPush()`). pushState-inside-popstate는 브라우저가 백 내비게이션을 처리하는 중에 history를 다시 바꾸는 일로, 안드로이드 PWA의 실제 Back 타이밍(빠른 2연타, IME/저장 타이머와 겹침, bfcache)에서 보전이 한 번 어긋나면 다음 Back이 **2겹을 한 번에 닫거나** 한 단계를 건너뜁니다.

**수정 — 결정적 slot 모델로 아키텍처 재구성:**
원칙 (popstate 핸들러 상단 주석에 기록됨):
1. 모든 화면 단계(오버레이, 폴더 하위 페이지, 팝업/⋮ 메뉴)는 history slot을 **정확히 1개**씩 가진다.
2. popstate(사용자 Back)는 **상위 1단계만 닫는다 — 핸들러에서 pushState를 절대 하지 않는다.**
3. 프로그래밍 열기 = open 시 `histPush()`, 프로그래밍 닫기 = close 시 `histPop()` (1 slot 소모).
4. slot 없는 가상 상태(다중 선택 모드, 이미지 선택, 보관 모드 진입)만 Back 시 net-0 재보상.

구체 변경:
- **폴더 하위 페이지가 각자 slot 보유**: `openFolderDetail` / `openAllNoteSelect` / `openFolderTrash` 진입 시 `histPush()`. 메뉴가 열려 있으면 **먼저** 메뉴 slot을 소모하고 나서 페이지 slot을 push(순서 반대로 하면 새 slot이 자기 소모에 먹혀 죽은 Back이 남음).
- **`←` 버튼**(`#fdBack/#fsBack/#ftBack`): `folderHubBack()` + slot 1 소모(`histPop`).
- **teardown 경로가 slot을 정확히 소모**:
  - `closeFolderOverlayNow()` 헬퍼 신설 — 오버레이 1 + 활성 하위 페이지 1 소모. `folderHome`(집 버튼), `vaultTransferCloseFolderHub`, `VLT.leave`, `resetToFirstNotesScreen`(전체 OVS 개수 + 폴더 하위 1 소모)가 모두 거친다. 기존 `VLT.leave`/`resetToFirstNotesScreen`의 "OVS만 지우고 slot은 남김" 누수를 제거.
- **⋮ 메뉴 4종도 slot 보유**(`#fhMoreMenu`/`#fdMoreMenu`/`#fdViewMenu`/`#vaultMainMore`): 처음 열릴 때만 push, 닫는 모든 경로(Back=브라우저가 소모 → `consume=false`, 바깥 탭/다른 메뉴 교체/페이지 전환=`consume=true`)가 정확히 1 slot 소모. `closeMenuSlot(sel,consume)` 헬퍼로 중앙화.
- **노트 이동 목록(selectMode='move')도 slot 보유**: `#fsMove` 진입 push, `←`/Back/이동 완료(`moveSelectedNotes`) 시 소모. 이동 완료·삭제 완료 시 `setFolderHubPage('hub')`로 내려오는 경로에 slot 소모 추가(누수 방지).
- **기존 팝업의 slot 불균형 소修**: `#edColorBtn`/`#edKebab`이 서로 다른 팝업을 열 때 기존 팝업 slot을 소모하지 않던 누수 수정.
- `hasSomethingToClose()` 함수 및 popstate 내 보전 push 제거.

**검토 (validate):**
E2E(Playwright, 실제 chromium) — 전부 통과:
- `폴더 hub → 상세 → 노트 → 타이핑(저장 완료 대기 3.6초) → Back#1: 상세 / Back#2: hub(오버레이 유지) / Back#3: main / Back#4: 종료 안내 toast(죽은 Back 없음)` — 일반 폴더.
- Vault 폴더: `vault main → hub → 상세 → 노트 → 타이핑 → Back×3 → vault main(gate 없음, key 유지)`.
- 빠른 2연타(120ms 간격): 에디터에서 2번 → hub (겹 건너뛰기 없음).
- 저장 대기 중(입력 0.8초 후) Back: 에디터 닫히고 상세로, 입력 텍스트는 저장됨.
- select/move/trash: 메뉴 진입 select → Back → hub → Back → main; move 목록 → Back → select 목록(선택 유지) → Back → hub → Back → main; 이동 완료 후 hub → Back → main → 종료 안내(팬텀 없음); trash ← → hub → Back → main → 종료 안내.
- popstate 핸들러에 `pushState` 0건(정적 검증), page/console 에러 0건.

---

## 요청 2 — Vault 자동 잠금: 빠져나갔다 바로 들어가면 비밀번호를 다시 묻지 말 것

**확인 (repro):**
- v7.5.1까지도 `pagehide` 핸들러가 `VLT.leave()`를 호출해, **앱을 백그라운드로 돌리는 것만으로도(PWA 홈 전환, 탭 전환) key가 지워져** 재진입 시 password gate가 다시 나타났습니다. E2E에서 `pagehide` 이벤트 발행 → `VLT.key` 소멸을 재현 확인.
- 즉 사용자가 설정한 5분/30분 timeout이 아니라 "앱 전환"이 잠금 트리거가 되고 있었습니다.

**수정 — timeout이 유일한 잠금 경계:**
- `pagehide`에서 `VLT.leave()` **제거** (자동 스냅샷 `autoSnapshot(true)`만 유지). 이제 백그라운딩은 잠금과 무관.
- **실제 만료(deadline)만 정확히** 잡기 위한 점검 3곳:
  1. `pageshow persisted`(bfcache 복원) — v7.5.1에서 추가, 유지.
  2. `visibilitychange → visible`(foreground 복귀) — v7.5.1에서 추가, 유지.
  3. **(v7.5.2 추가) `VLT.open()` 재진입 직전**: `this._autoUntil`이 과거이면 `leave()` 후 gate. 백그라운드에서 타이머 callback이 한 번도 다시 실행되지 않은 동결 세션(예: 화면 오프 중 1분 설정)을 재진입 즉시 잠금.
- key 소멸 경계는 ① timeout 만료(위 점검으로 보장) ② 프로세스 실제 종료로 수렴.
- `SECURITY_NOTES_KO.md`의 "timed warm session의 정확한 경계" 섹션을 이 경계에 맞게 재작성.

**검토 (validate):** E2E 10케이스 전부 통과 —
- unlock → `← Normal notes` → 바로 재진입: **gate 없음** (key 유지).
- `pagehide`+`hidden` 발행(백그라운딩 모의) → key 유지.
- `visible`+`pageshow persisted` 발행(timeout 전) → key 유지 → 재진입 gate 없음.
- `VLT._autoUntil`을 과거로 강제 + foreground 복귀 → **즉시 잠금**(key null, vault 종료).
- 잠금 후 🔐 → gate 표시 → password로 정상 unlock.
- foreground 유지 상태에서 deadline만료 + 재진입 → gate 표시(신규 `open()` 가드).
- VM 해르네스: `pagehide` 핸들러에 `VLT.leave` 0건, `open()` deadline 가드 존재 확인.

**보안 트레이드오프 (문서에 명시):** 공유 기기에서 앱이 백그라운드에 머문 동안 timeout이 지날 때까지는 다른 사람이 같은 실행 중인 Vault를 열 수 있음 — timeout 1분 설정 또는 프로세스 종료가 가장 강한 잠금. (v7.5.1의 "pagehide=즉시 잠금"보다 완화. 사용자 요청에 의한 의도된 변경.)

---

## 요청 3 — 설정 → 노트 글자 굵기: 4단계 → 3단계 (가장 가벼운 것 제거)

**확인:** `#stFontWeight`에 `l`(Light 300) / `n`(500) / `b`(700) / `x`(900) 4개 option, `FONT_WEIGHTS={l:'300',n:'500',b:'700',x:'900'}`.

**수정:**
- `<option value="l">Light (300)</option>` **삭제** → Normal/Bold/Black 3단계.
- `FONT_WEIGHTS` 맵에서 `l` 제거 (잔여 'l' 값은 `||'500'` 폴백으로 Normal 적용).
- **이관 (fwVer 2→3)**: `load()`에서 `fontWeight==='l'`이면 `'n'`으로 변환 후 `fwVer=3` 기록. 기존 fwVer=2 마커 블록과 순차 실행.
- **Vault 설정도 같은 이관**: `VLT.init()`(legacy 경로)과 decrypt 경로(format≥2 envelope 복호화 직후)에서 `'l'→'n'` 정규화.
- `html[data-notefw="300"]` CSS는 잔존 데이터 방어용 그대로 유지.

**검토 (validate):** E2E — (1) option 정확히 3개(n/b/x), (2) `sk.settings={fontWeight:'l',fwVer:2}` 시드 후 로드 → 메모리 `fontWeight==='n'`, `fwVer===3`, `<html data-notefw="500">`, (3) select에서 Light 0건, (4) 전역 'x' 선택 시 `data-notefw==="900"` 적용. VM 해르네스 — 맵 3단계 확인, 이관 코드 존재, Vault 정규화 2곳 확인. (이관은 기존 fwVer=2/ fmtVer 마이그레이션과 동일한 in-memory-only 패턴 — 저장된 값은 다음 설정 저장 시 갱신되며, 로드는 항상 idempotent하게 이관됨.)

---

## 요청 4 — 글자 설정은 모든 노트에 동일하게 적용 + ⋮ 메뉴 배경 탭 닫기

### 4a. 모든 노트에 동일하게

**확인:** 노트별 굵기 오버라이드(`n.fontWeight`)는 케밥 UI에서 이미 제거된 상태였으나 **백업 복원(`applyBackup`)의 raw push**(`Object.assign({},sn)`)를 통해 재유입 가능 — 이 노트만 굵기가 다른 현상.

**수정:**
- `applyBackup`의 normal 노트 루프와 legacy `vaultNotes` 루프에서 `delete sn.fontWeight` — 복원 노트에 노트별 굵기가 들어오지 않음.
- `applyEditorWeight`가 `n.fontWeight`를 참조하던 부분을 **전역 `sc.fontWeight`만** 사용하도록 변경 — 어떤 경로로 잔여 값이 들어와도 모든 노트가 동일 렌더.
- (이미 존재하는) `fmtVer` 이관의 `n.fontWeight` 제거, sync `toRow/fromRow`가 fontWeight를 매핑하지 않는 것 유지.

**검토 (validate):** E2E — `fontWeight:'x'`를 가진 노트를 `applyBackup`으로 복원 → 복원된 노트에 `fontWeight` own property **없음**. VM 해르네스 동일 검증.

### 4b. ⋮ 버튼이 여는 메뉴박스 — 배경 탭으로 닫기

**확인:** `#edMenu`/`#edColorPop`(에디터 )은 바깥 탭 닫기가 있었으나, **`#fhMoreMenu`(폴더 hub ⋮) / `#fdMoreMenu`(폴더 상세 ⋮) / `#fdViewMenu`(보기 방식) / `#vaultMainMore`(보관 ⋮) 4종은 바깥 탭 닫기가 전혀 없었습니다.** (Back으로만 닫힘)

**수정:**
- document-level click 핸들러 추가: 열려 있는 ⋮ 메뉴 1개를 찾아, 타깃이 **메뉴 내부도 아니고 트리거 버튼(`#fhMoreBtn/#fdMoreBtn/#fdViewBtn/#btnVaultMore`)도 아니면** 전용 클로저로 닫는다 — slot 소모 포함(요청 1의 slot 모델과 정확히 일치).
- 트리거 재탭 = 토글(기존 동작 유지), 메뉴 아이템 클릭 = 항목 동작(페이지 전환 시 closeFolderMore가 slot 소모).

**검토 (validate):** E2E — hub ⋮ / 상세 ⋮ / 보기 방식 / 보관 ⋮ 각각: 열기 → 배경(`#folderOverlay`/`documentElement` 클릭) → 닫힘(상위 화면 유지); Back은 메뉴만 닫고 상위 화면 유지; 트리거 재탭 토글 정상.

---

## 버전·배포

| 항목 | v7.5.1 | v7.5.2 |
|---|---|---|
| `APP_VER` / sw `VERSION` | 7.5.1 | **7.5.2** |
| CSP inline 해시 | `sha256-BKMCAD1eL1PRF05s/3YMeAt1jmLOOFZradY9a7dNtxc=` | **`sha256-q1xisLeV32CvBA8N0LfcIaI9+U6gP9eqXjMhcljnXlI=`** |

- `DEPLOYMENT_HEADERS.txt`의 CSP를 새 해시로 갱신 — **서버 헤더도 반드시 함께 갱신** (오래된 해시 헤더가 먼저 적용되면 인라인 스크립트가 실행 거부되어 앱이 죽습니다).
- sw.js VERSION 7.5.2 → 기존 설치본은 자동 갱신.
- `SECURITY_NOTES_KO.md` warm-session 경계 섹션 재작성 (요청 2의 트레이드오프 포함).
- `README_KO.md` v7.5.2 변경점 + 배포 뒤 빠른 확인 8단계 갱신.

## 테스트 자산 (repo: `review/`)

- `verify752_e2e.js` — Playwright E2E 75개 체크 (node + playwright 1.63, chromium headless). 실행: `python3 -m http.server 8123` (fix_v7.5.1/ 기준) + `node verify752_e2e.js`.
- `verify752.js` — 실제 함수 추출 VM 해르네스 30개 체크. `node verify752.js`.
