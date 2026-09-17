# soonenote v7.5 — Back · Vault · Folder · backup 검증 보고서

**검증일:** 2026-09-11  
**작업 사본:** `/home/user/work_v7.5/`  
**기준본:** `/home/user/uploads/`는 수정하지 않았습니다. 최종 MD5:

```text
uploads/index.html  db5cca58119d8b012622be02450943b2
uploads/sw.js       27ad8a489d3da09d2ab1e775d4252e89
```

## v7.6.9 검증 (2026-09-16)
- verify769 16/16, 762/763/766/768 재확인.

## v7.6.8 검증 (2026-09-16)
- verify768 통과(이름→블록 간격 ≤8px, 블록 좌우 끝까지, 겹침 없음), 766/767 재확인.

## v7.6.7 검증 (2026-09-16)
- verify767 통과, 766 재확인.

## v7.6.6 검증 (2026-09-16)
- verify766 통과, 762/763 재확인.

## v7.6.5 검증 (2026-09-16)
- verify765 통과(아래 기록), 762/763 재확인.

## v7.6.4 검증 (2026-09-16)
- 토스트 5초/8초로 조정(verify763의 시간 기대값 갱신) — verify763 13/13, verify762 15/15 재확인.

## v7.6.3 검증 (2026-09-16)
- `review/verify763_e2e.js` **13/13** (토스트 지속, Undo/T 크기, S 테두리, 폴더 상단바 full-bleed·높이 일치·색, 폴더 안 노트 레이아웃, 오류 0). 스크린샷 `review/shot763_bars.png`.
- 회귀 753~762: 72/40/48/69/28/56/17/27/27/15 전부 통과(762의 상단바 색 기대값을 v7.6.3 색으로 갱신).

## v7.6.2 검증 (2026-09-16)
- `review/verify762_e2e.js` **15/15 통과** (상단바 순서·연필/✓ 부재·즉시 편집·S 배지, 자동저장 0.6초, T 박스 B/U+빨강·폭 128px, 제목 1탭/2탭, 폴더 허브·상세 상단바 및 노트 개수 배지 색, 페이지 오류 0).
- 회귀: verify753 72, 754 40, 755 48, 756 69, 757 28, 758 56, 759 17, 760 27, 761 27 — 전부 통과(연필 클릭을 `focus('#edBody')`로, 759의 B/I/U 3개→2개, 761 APP_VER 7.6.2로 갱신). verify752의 S5/S7c 5건은 v7.6.1 원본에서도 동일하게 실패하는 오래된 기대값(가중치/이동 흐름은 v7.5.4·7.5.7에서 의도적으로 변경) — 본 패치와 무관.
- `node --check` 인라인 스크립트 통과. CSP 해시 index.html/DEPLOYMENT_HEADERS.txt 일치.

## v7.6.1 검증 (2026-09-16)

**진단:** `/home/user/review/diag760_photolink.js`(A–F 시나리오), `diag760_b/c/d/e.js`(원인 재현) · **E2E:** `verify761_e2e.js`

| 내용 | 결과 |
|---|---|
| BUG-001: 본문 입력 <3초 후 앱 전환 → 보존 · 제목 변경 후 pagehide → 보존 · 복귀=첫 화면 규칙 유지 | PASS |
| BUG-002: 선택기 왕복(hidden→visible→change, hidden→change→visible 두 순서) → 편집기 유지, 칩 삽입, 저장·메타 보존, 재열기 후 사진 열림 | PASS |
| 선택 취소 → 편집기 유지·칩 없음·유예 후 일반 앱 전환은 다시 첫 화면 | PASS |
| prune: 편집기 열린 채 자동저장 후 메타 유지, 닫은 뒤 미참조 메타만 정리 | PASS |
| UX-001 문구 · 데이터 크기 2줄 표시 · `FEATURES.sync=false` 시 클라이언트 생성 0, 계정 화면 미노출, 안내 토스트 | PASS |

**합계: 27/27.** 회귀: v7.6.0 27(문구·prune 시점·버전 체크 갱신) · 7.5.9 17 · 7.5.8 56 · 7.5.7 28 · 7.5.6 69 · 7.5.5 48 · 7.5.4 40 · 7.5.3 72 전부 통과.
CSP: `sha256-JXEtP5rL2qcICPr+EaceWE8t+zVXhCdAcvmcROD3F9k=`.

## v7.6.0 검증 (2026-09-14)

**E2E:** `/home/user/review/verify760_e2e.js` (Playwright · 웹 fallback + Capacitor 플러그인 mock)

| 내용 | 결과 |
|---|---|
| 카메라 input/`capture` 없음 · `insertImageFile`/`compressImage` 제거 · 🖼 버튼(제목 '사진 링크') | PASS |
| 이미지 붙여넣기 → 거부 토스트, `<img>` 삽입 없음 | PASS |
| 웹: 300 KB 파일 선택 → 칩 `🖼 big.png`(contenteditable=false) · 메타 name/size/added, uri 빈값 · 참조표 <300 B · 저장된 본문 <400자, base64 없음 | PASS |
| 웹: 같은 세션 탭 → 뷰어 · Back = 뷰어만 닫힘 · 새로고침 후 칩 유지 + "세션 동안만" 안내 | PASS |
| 네이티브 mock: `pick` → `content://` uri·4.2 MB 메타만 저장 · 탭 → `open(uri)` 호출 · 링크 2개여도 본문 <600자/참조 <500 B | PASS |
| 칩 삭제 후 저장 → 참조 자동 정리(prune) | PASS |
| 옛 base64 이미지 노트 렌더 유지 | PASS |
| 백업에 `photolinks` 포함 · 복구 시 병합 | PASS |
| Vault: 참조가 `VLT.photolinks`(암호문 안)에만, 평문 `sk.photolinks`에 없음, 암호문에 파일명 미노출 · leave 시 메모리 비움 | PASS |
| pageerror 0 (selectstart 핸들러의 텍스트노드 target 잠재 버그 수정 포함) | PASS |

**합계: 27 passed / 0 failed.** 회귀: v7.5.9 17 · 7.5.8 56 · 7.5.7 28 · 7.5.6 69 · 7.5.5 48 · 7.5.4 40 · 7.5.3 72 전부 통과(버전 문자열 체크만 7.x로 완화).
CSP: `sha256-jnxyJxLIOvEegaMN42+BOuzajUNvA1rSU5LqVC+UOWk=`.

## v7.5.9 검증 (2026-09-14)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify759_e2e.js`

| 항목 | 내용 | 결과 |
|---|---|---|
| 1 | 폴더 hub ⋮: '정렬'·'폴더 한 줄 개수' 없음 · 모든 노트 선택/노트 이동 유지 · Back = 메뉴만 닫힘 | PASS |
| 2 | 폴더 상세 ⋮: '정렬'·'노트 한 줄 개수' 없음 · 이름 변경/휴지통 유지 · Back = 메뉴만 닫힘 | PASS |
| 3 | T 서식 박스: `#tpClose` 없음 · 손잡이·B/I/U 유지 · Back = 박스만 닫힘(편집기 유지) · T 재탭으로 닫힘 | PASS |

**합계: 17 passed / 0 failed** (pageerror 0).
**회귀: v7.5.8 56/56 · v7.5.7 28/28 · v7.5.6 69/69 · v7.5.5 48/48 · v7.5.4 40/40 · v7.5.3 72/72**
(v7.5.8 suite의 고정 버전 문자열 체크와 v7.5.3 suite의 '메뉴 몸통 클릭으로 닫기' 한 줄만 갱신 — 메뉴가 짧아져 빈 영역이 없어짐).
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-/SRB9coCTGpP54yG+7TQxH5oh/ssK/Yv1H45N6EGJ8Q=`.

## v7.5.8 검증 (2026-09-14)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify758_e2e.js` (Playwright) + `/home/user/review/sw_unit.js` (sw.js 알림 로직 단위 검증)

| 섹션 | 내용 | 결과 |
|---|---|---|
| S1 | Vault 스냅샷 복구(기기 백업 목록) → 확인 → **비밀번호 팝업 즉시 표시**, 백업/설정 창 닫힘 → 입력 시 복구된 노트로 Vault 진입 · 게이트에서 Back 1회 = 첫 화면 | PASS |
| S2 | 첫 비밀번호 설정 → 바로 Vault 진입(안내 토스트 없음) · 폴더 화면 ➡️ 이동 → 🔐 Vault = 비밀번호 팝업(pendingTransfer stage pick) · '열어 주세요' 문구 없음 | PASS |
| S3 | Vault ⋮: 보기 방식/정렬/노트 한 줄 개수 없음 · 모든 노트 선택/노트 이동/자동 잠금 유지 · Back = 메뉴만 닫힘 | PASS |
| S4 | 편집기 ⋮: 폴더로 이동/전체 텍스트 선택/Vault로 이동 없음 · 알림 설정 창 z-index 90 > 55, `elementFromPoint`로 최상단 확인 · 알림 저장 반영 · Back = 알림 창만 닫힘 · Vault 편집기는 '일반 노트로 이동' 유지 | PASS |
| S5 | (full Chromium, 알림 권한 허용) 상단 고정 → SW 알림 tag `sk-pinned-<id>` · requireInteraction · data.pinned · SK_UNPIN 통보 후 닫힘은 재게시 안 됨 · `syncPinnedNotifications()`가 빠진 알림 복원 · 고정 해제 → 알림 사라지고 유지 · 새로고침 후에도 고정 알림 유지 · 앱은 setAppBadge 미사용 | PASS |
| S6 | APP_VER/sw VERSION 7.5.8 · CSP meta 아래 스크립트 정상 · moveToVault/moveNoteFolder 제거 | PASS |
| sw_unit | notificationclose: 고정 알림 재게시(silent, requireInteraction) · 비고정 tag 무시 · SK_UNPIN 뒤 닫힘은 1회만 무시 · 고정 알림 클릭 시 close 안 함 | 6/6 PASS |

**합계: E2E 56 passed / 0 failed + sw 단위 6/6** (pageerror 0).
**회귀 재실행: v7.5.7 28/28 · v7.5.6 69/69 · v7.5.5 48/48 · v7.5.4 40/40 · v7.5.3 72/72** (수정 없이 전부 통과).
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-bgVsvfBj/vTvdzP3QWyCDSPov4B3vAgJCJy6YGwx5XU=`.
메모: Playwright 기본 headless shell은 알림 권한을 항상 denied로 두므로 S5만 `channel:'chromium'`으로 실행. 스크립트 `close()`는 `notificationclose`를 발생시키지 않아(사용자 스와이프 전용) 재게시 경로는 sw_unit.js에서 검증.

## v7.5.7 검증 (2026-09-14)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify757_e2e.js` (Playwright 실브라우저)

| 섹션 | 내용 | 결과 |
|---|---|---|
| S1 | Vault 진입 시 `<html>.vault` · 라이트 바탕 `#f8e4e1`(파스텔 레드)·`--bg2` 톤 · Vault 폴더 오버레이도 톤 유지 · Vault 테마 dark 시 `#312422` · Vault 종료 시 원래 배경 복귀 | PASS |
| S2 | 이동 리스트 120%: 리스트=기준 1.2×, 버튼 행=13.33px의 1.2×(16px), 제목·아이콘·행 패딩(높이) 각각 1.2× 실측 · 읽기전용 행도 1.2× · 2단계→1단계 유지 / 노트 선택 목록에서 클래스 제거(누설 없음) | PASS |
| S3 | 회귀: 확대된 리스트에서 폴더 드릴다운→이동 완료→hub 도달 | PASS |

**합계: 28 passed / 0 failed** (pageerror 0).
**회귀 재실행: v7.5.6 69/69 · v7.5.5 48/48 · v7.5.4 40/40 · v7.5.3 72/72** — v7.5.6/7.5.5 suite의 "150% 제거" 점검은 v7.5.7 "120% 도입"과 충돌하는 항목만 갱신(같은 클래스가 120%로 재도입). Vault 세션·게이트(contenteditable)·드릴다운·4열·'제목 없음' 등 전부 통과.
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-xNolH3bmvxAv2PjzJlef+HICZNOxCF0qN2lAqYS/i6E=`.
메모: Vault는 자체 설정(테마 포함)을 쓰는 구조라 바탕색의 라이트/다크 판정은 Vault 테마를 따름(일반 화면 테마와 독립). 버튼 행(`<button>`)은 UA 기본 13.33px 기준이라 120% = 16px로 명시.

---

## v7.5.6 검증 (2026-09-14)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify756_e2e.js` (Playwright 실브라우저)

| 섹션 | 내용 | 결과 |
|---|---|---|
| S1 | 게이트 필드 = contenteditable DIV(게이트 내 `input[type=password]` 없음 → 자동완성 부착 대상 소거) · 키보드 입력→볼트 표시·평문 비노출·백스페이스 · fill 경로 · 해제 성공 · 틀린 비밀번호→잠김+입력 지움 | PASS |
| S2 | 이동 버튼 ➡ 유지 · 하얀 박스 제거(배경=기본 .sbtn, box-shadow 없음, 크기도 기본) | PASS |
| S3 | 150% 제거(행 원래 크기) · 루트 타일 3개(첫 화면/폴더/Vault) · 폴더 드릴다운→이동 · 첫 화면 드릴다운(노트 목록+실행 행)→폴더 밖 이동 · Back 4연속(2단계→루트→선택목록→hub→main) | PASS |
| S4 | Vault: 잠김→타일→게이트→해제 후 Vault 2단계(View 진입 전) · Vault 폴더 선택→**암호화 이동**(일반에서 제거, Vault 폴더에 복제) · 해제 상태→게이트 없이 2단계 · 2단계 Back 4연속 | PASS |
| S5 | 회귀: NCOLORS=5, Vault 세션 reload 유지(warm 진입 게이트 없음), '제목 없음' 저장 | PASS |

**합계: 69 passed / 0 failed** (pageerror 0).
**회귀 재실행: v7.5.5 48/48 · v7.5.4 40/40 · v7.5.3 72/72** — v7.5.5 suite는 게이트/이동 화면 변경에 맞춰 점검 항목 갱신(기능 회귀는 유지), Vault 세션·체크박스·4열·인라인 변경 전부 통과.
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-WloE8Dsa47VB1w+NMcPOs/lVxFBJOnx2aURT7A+uDrQ=`.
히스토리 정산: 2단계 진입/이탈은 전용 slot(enter 시 push / 2단계 Back 시 pop)이라 브라우저 뒤로가기·버튼 Back 모두 한 겹 규칙 유지. 이동 완료(2단계) 시 level+select+move 3 slot 소모 계산 검증.

---

## v7.5.5 검증 (2026-09-14)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify755_e2e.js` (Playwright 실브라우저)

| 섹션 | 내용 | 결과 |
|---|---|---|
| S1 | `#vGatePass`/`#dlgInput` `autocomplete=new-password`(+ 고유 name) — 저장된 비밀번호 자동완성 제안 차단 속성 검증 · PIN 설정 후 잠금→게이트→해제·재잠금→게이트→재해제 기능 회귀 | PASS |
| S2 | 이동 버튼 아이콘 ➡(우측, 📤 없음) · 라벨 '이동' · computed style: weight 800·크기·패딩이 휴지통보다 큼 | PASS |
| S3 | 이동 대상 목록 행 font-size = 기준의 150% (computed 검증) · 제목/패딩 확대 · 노트 선택 목록으로 복귀 시 클래스 제거(누설 없음) | PASS |
| S4 | NCOLORS=5, 배열 5개(본문/제목 라이트·다크)·이름 5개(라벤더 끝) · **실데이터 이관**: 색 5→0, 6→1, 4 유지, defColor 6→0 · 설정 기본컬러 스와치 5개 · 에디터 컬러 팝업 5개 | PASS |
| S5 | 회귀: 이동 플로우(폴더로 이동) · 빈 제목+내용 → '제목 없음' | PASS |

**합계: 47 passed / 0 failed** (pageerror 0).
**v7.5.4 회귀 스위트(`verify754_e2e.js`) 재실행: 40 passed / 0 failed** · **v7.5.3 회귀(`verify753_e2e.js`): 72 passed / 0 failed** — 글자 굵기 500/600/700, 이동 버튼 위치·플로우, '제목 없음' 저장, Vault 세션, 4열 등 전부 유지.
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-YNSGqLIswLSCAl7b4nGNIc3JhZQwF5Nj2vJJtuxEWr8=`.
마이그레이션 순서 점검: v6.4 `palVer` MAP 이관이 5색 클램프보다 먼저 실행되도록 5색 클램프를 palVer 블록 **뒤**로 배치(옛 데이터 7색 번호가 클램프 후에도 유효 범위 유지).

---

## v7.5.4 검증 (2026-09-13)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify754_e2e.js` (Playwright 실브라우저)

| 섹션 | 내용 | 결과 |
|---|---|---|
| S1 | FONT_WEIGHTS {500,600,700}, 드롭다운 라벨 5개 언어, 선택 시 data-notefw 500/600/700, 저장 키 유지 | PASS |
| S2 | 선택바  이동 = ️ 휴지통 **좌측** 표시(순서 검증) · 일반 화면에서 폴더로 이동 · 폴더 상세(일반)에서 선택→이동(폴더 밖 포함) · 이동 대상 목록(폴더 없음/각 폴더/Vault) · Back 한 겹(대상→선택목록→hub→main) · 휴지통 모드 숨김 · 이동 완료 후 hub 도달 | PASS |
| S3 | 내용+빈 제목 → `제목 없음` 저장 · 체크 항목+빈 제목 → `제목 없음` · 제목 입력 시 유지 · 완전 빈 노트 자동 삭제 유지 | PASS |
| S4 | 회귀: 폴더 4열 고정(v7.5.3)·인라인 폴더명 변경(v7.5.3) 유지 | PASS |

**합계: 40 passed / 0 failed** (pageerror 0).
**v7.5.3 회귀 스위트(`verify753_e2e.js`) 재실행: 72 passed / 0 failed** — Vault 세션(reload/변조/만료/PIN 변경), 체크박스 50%, 폴더 상세 택·삭제, 타일 롱프레스 제거, 인라인 변경, 4열 전부 유지 확인.
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-ieEG1Fqfh/TnApBTul41EnwskGLTNwgFxjh2X4XtMMs=`.
headless history 동시 pop→push 경합(slot 깨짐) 계측 확인 → `#selMove`는 exitSel back 커밋 후 push(60ms)로 처리.

---

## v7.5.3 검증 (2026-09-12)

**작업 사본:** `/home/user/fix_v7.5.1/` · **E2E:** `/home/user/review/verify753_e2e.js` (Playwright, chromium 실브라우저)

| 섹션 | 내용 | 결과 |
|---|---|---|
| S1a | Vault: unlock → 나감 → **page.reload() → 재진입 = gate 없음**(사용자 시나리오), 세션 저장 확인, 노트 보존 | PASS |
| S1b | 만료 세션 → 시작 시 삭제, 재진입 시 gate | PASS |
| S1c | 변조 세션 → GCM 실패 → 삭제 + gate, 본래 비밀번호로 정상 복호화 | PASS |
| S1d | 비밀번호 변경 → 구 세션 폐기, reload 후 새 비밀번호만 | PASS |
| S2 | 메인 롱프레스 선택, **체크박스 실측 = 기존 50%**, 탭 해제, 전체 선택 → ️ → 2건 휴지통 | PASS |
| S3 | 폴더 상세(일반) 롱프레스 택, pool=폴더 노트, 전체 택 → 삭제 → 그리드 갱신, Back=선택만 종료 | PASS |
| S4 | Vault 메인 택·삭제 + **Vault 폴더 상세** 롱프레스 택·삭제 | PASS |
| S5 | 폴더 타일 롱프레스 → dlg 없음, `bindFolderTileRename` 제거, 탭=상세, 힌트 없음 | PASS |
| S6 | `#fdTitle` 탭 → 인라인 박스(미리 채움, 포커스, dlg 없음), Enter 커밋, Esc 취소, 빈 값 거부, **Vault 폴더 동일** | PASS |
| S7 | 폴더 hub **4열 고정**(일반+Vault, 설정 변경 무시), '보기 방식' 메뉴 제거 | PASS |

**합계: 72 passed / 0 failed** (pageerror 0). 구문: `node --check` (인라인 스크립트 추출) 통과.
CSP: index.html meta = `DEPLOYMENT_HEADERS.txt` = `sha256-hL58TG49dKikUVOOcnvhJBeVFCnQnaTufYUYMmvI1eU=`.
v7.5.2 회귀: S3/S4 Back 한 겹 규칙, Vault warm(deadline) 동작이 S1·S3·S4에 포함되어 유지 확인.

---

## 구현 확인

1. `popstate` Back 처리에서 light popup → selection → overlay → Vault → main-home 순서를 한 단계씩 처리합니다. Folder detail은 overlay를 닫기 전에 Folder Hub로 먼저 돌아갑니다.
2. editor T popup은 upper-right `×`를 만들고 z-index를 다른 editor popup보다 높였습니다. document outside-click cleanup과 repeated-T toggle 대상에서 제외했으므로 X/Back만 popup을 닫습니다.
3. `VLT.exitView()`는 normal Notes UI만 복원하고 key/decrypted data/auto-lock timer는 보존합니다. `VLT.open()`은 유효한 warm key가 있으면 gate 없이 `enter()`합니다.
4. `VLT.armAutoLock()`은 Vault UI visibility와 무관하게 실제 1/5/15/30분 timer를 scheduling하며 callback은 full `leave()`로 key와 decrypted state를 제거합니다.
5. pagehide는 Vault main이 아닌 normal Notes에 있는 warm session까지 포함해 key를 clear합니다. bfcache/pageshow 및 foreground return은 transient screen을 남기지 않고 main Notes로 보냅니다.
6. Vault bottom bar는 normal Notes, All, Notes, `📁` 네 buttons만 렌더합니다. text `+ Folder` 및 per-folder chips는 없습니다. independent right-side new-Vault-Note FAB는 유지됩니다. v7.4 compact strip control min-height 31.28px 대비 v7.5는 약 34.4px입니다.
7. `folderDetailGrid`는 main Notes와 같은 usable width/1mm gutter 및 square grid-card behavior를 사용합니다. legacy broad `.grid .note` selector와 충돌하지 않도록 detail view class를 `folder-note-grid|list|titles`로 namespace 했습니다. normal and Vault `folderNote*` preferences remain separate.
8. encrypted v2 envelope, password minimum 12, PBKDF2 parameters, ciphertext-only backup, and destination-first normal→Vault transfer were not changed.

## 자동 검증

### Static / integrity

`python3 /home/user/validate_v75_release.py`:

- v7.5 `APP_VER`, Service Worker cache version, inline CSP SHA-256 및 local vendor SRI 검증
- inline app JS, Service Worker, vendor syntax 검사
- external CDN/fallback 없음, duplicate DOM IDs 없음
- required v7.5 T, Back/lifecycle, Vault session/timer, bottom bar, detail card namespacing assertions
- ciphertext-only backup and 12-character password guard assertions
- untouched baseline MD5 assertions

### Browser: Playwright Chromium

`node /home/user/qa-jsdom/qa-browser-v75.js` passed.

- normal Folder: main → Hub → detail → editor → T → editor → detail → Hub → main Back sequence
- T popup: visible upper-right X; outside title tap, color tool, Kebab tool do not dismiss; X and browser Back each dismiss only T
- normal Folder detail and Vault Folder detail card geometry equals main Notes grid geometry at mobile viewport; normal/Vault Folder detail preferences remain independent from each other and main
- Vault lower bar exactly has `← Normal notes`, `All`, `Notes`, `📁`, retains new-note FAB, and has ~34.4px min-height
- Vault exit to normal Notes retains key/data/real timer; re-entry before deadline shows no password gate
- nested Vault Folder Back chain ends at normal main Notes
- actual `armAutoLock()` one-minute callback was time-compressed only in test harness; its own callback executed and cleared key/notes/folders, after which password gate returned
- reload and bfcache-like navigation both return to normal main Notes; page departure clears a warm key even when Vault was already exited to normal Notes
- actual Settings → Backup download was parsed; it contains normal data plus encrypted snapshot and no Vault plaintext
- actual UI normal restore and Vault snapshot restore confirmation were exercised in a separate browser context; restored Vault ciphertext stayed locked/no plaintext and opened successfully only after password entry

## Final packaging / clean extraction verification — passed

- `soonenote-v7.5-release.zip` passed `unzip -t`.
- It was extracted to a new clean directory; `sha256sum -c SHA256SUMS.txt` and `validate_v75_release.py` both passed there.
- The full v7.5 Playwright suite passed again against that extracted directory on a separate static server.
- The self-download HTML was decoded and also clicked in Chromium; each yielded bytes identical to the release ZIP.

Compare the release file yourself with `sha256sum soonenote-v7.5-release.zip` and the value reported with the release.
