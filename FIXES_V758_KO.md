# soonenote v7.5.8 — 수정 내역 (사용자 피드백 5건)

**일시:** 2026-09-14 · **기준본:** v7.5.7 · **작업본:** `/home/user/fix_v7.5.1/`
각 항목을 **확인 → 수정 → 검토(Playwright 실브라우저 E2E)** 순으로 처리.
v7.5.8 신규 56 체크 + sw.js 단위 6 + v7.5.7 28 + v7.5.6 69 + v7.5.5 48 + v7.5.4 40 + v7.5.3 72 회귀 전부 통과.

---

## 1) Vault 복구·이동 때 "암호를 열어달라" 문구 → 비밀번호 입력 팝업

### 확인
- `restoreVaultSnapshot()`(기기 백업 목록의 [이 Vault 스냅샷 복구], 📂 파일 가져오기)는 암호문을 교체한 뒤
  토스트 "…이 백업의 Vault 비밀번호로 **열어 주세요**"만 띄우고 백업 목록으로 돌아갔다 → 사용자가 직접 Vault 칩을 눌러야 했다.
- `VLT.unlockPass()`의 첫 비밀번호 설정 분기도 "비밀번호가 설정되었습니다. **다시 Vault를 열어 주세요**"로 끝났다.
- 편집기 ⋮의 `moveToVault()`는 Vault가 잠겨 있으면 "**먼저 Vault를 열고** 비밀번호를 확인하세요" 토스트로 거절했다.
- 폴더 화면 ➡️ 이동 → 🔐 Vault 경로(v7.5.6 드릴다운)는 이미 게이트(비밀번호 팝업)를 띄우고 있었다.

### 수정
- 신규 `openVaultGateAfterRestore()`: 백업(`#bkOverlay`)·설정(`#setOverlay`) 창을 닫고 60ms 뒤 `VLT.open()` → **비밀번호 팝업(게이트) 즉시 표시**.
  기기 목록 복구 버튼과 파일 가져오기 두 경로 모두에서 호출. 토스트 문구는 "…백업 당시의 Vault 비밀번호를 입력하세요"로 교체.
- 첫 비밀번호 설정 후 `this.enter()`로 **바로 Vault 진입**.
- 편집기 ⋮의 `moveToVault()`/`moveNoteFolder()` 함수 자체를 삭제(3번 항목과 함께) → "먼저 열고…" 문구 경로 소멸.
  Vault로의 이동은 폴더 화면 ➡️ 이동(비밀번호 팝업) 한 가지로 통일.

### 검토
- S1: 스냅샷 복구 확인 → 게이트 표시(`#vGate.show`), 백업/설정 창 닫힘 → 비밀번호 입력 → 복구된 노트 1개로 Vault 진입. 게이트에서 Back 1회 = 첫 화면(OVS 0).
- S2: 첫 비밀번호 설정 → `ui.vault=true` 바로 진입. ➡️ 이동 → 🔐 Vault → 게이트 표시, `pendingTransfer.stage==='pick'`, '열어 주세요/먼저 열고' 문구 없음.

---

## 2) Vault ⋮ 메뉴 — 보기 방식 · 정렬 · 노트 한 줄 개수 제거

### 확인
- `renderVaultMainMore()`에 5개 항목 + 자동 잠금 select: 저장된 모든 노트 선택 / 노트 이동 / 보기 방식(하위 3) / 정렬(하위 5) / 노트 한 줄 개수(하위 4).

### 수정
- 보기 방식·정렬·노트 한 줄 개수 3개 항목(하위 선택 포함) 블록 삭제. 나머지 2개 + 자동 잠금 유지.
  (Vault 보기/정렬/열 개수 값은 `VLT.settings`에 그대로 남아 기존 설정대로 표시됨.)

### 검토
- S3: 메뉴 라벨에 '보기 방식'·'정렬'·'한 줄 개수' 없음, '모든 노트 선택'·'노트 이동'·`#vaultAutoQuick` 있음, Back = 메뉴만 닫힘.

---

## 3) 노트 화면 ⋮ — 알림 설정 미작동 수정 + 3개 항목 제거

### 확인
- **원인:** `#remindOverlay`는 공용 `.overlay`(z-index **50**)인데 편집기 `#edOverlay`는 z-index **55** → 알림 창이 편집기 **뒤에** 열려 보이지도 눌리지도 않았다(히스토리 slot만 소모돼 Back이 한 번 '헛도는' 느낌).
- 메뉴 항목: 상단 고정 / 알림 설정 / 공유 / 전체 텍스트 선택 / 폴더로 이동 / 전환 / Vault로 이동(또는 일반 노트로 이동) / 삭제.

### 수정
- CSS `#remindOverlay{z-index:90}` (게이트 80보다 위, 공통 dlg 110보다 아래).
- `buildKebab()`에서 **전체 텍스트 선택 · 폴더로 이동 · Vault로 이동** 3개 제거. 남는 항목: 상단 고정/해제 · 알림 설정 · 공유 · 메모↔체크리스트 전환 · (Vault) 일반 노트로 이동 · 삭제.
- 사용처가 없어진 `moveNoteFolder()`, `moveToVault()` 삭제.

### 검토
- S4: 라벨 3개 없음 · 알림 창 `z-index 90`, 화면 중앙 `elementFromPoint`가 알림 창 내부 · 시각 저장 → `remindAt` 반영, 창 닫히고 편집기 유지 · Back = 알림 창만 닫힘 · Vault 편집기는 '일반 노트로 이동' 유지.

---

## 4) 상단 고정 알림 — 수동 고정 해제 전까지 유지

### 확인
- 고정 시 `showPinnedNotification()`이 SW `showNotification(tag:'sk-pinned-<id>', requireInteraction:true)`를 1회 호출할 뿐, 사용자가 스와이프하거나 OS가 하루쯤 뒤 정리하면 **다시 만들지 않았다**.
- `requireInteraction`은 "자동으로 접히지 않게" 하는 힌트일 뿐, 안드로이드는 시간이 지나거나 알림 정리 시 지울 수 있다.

### 수정
- **sw.js**: `notificationclose` 리스너 추가 — `sk-pinned-*` 태그이고 `data.pinned`이면 0.4초 뒤 같은 태그로 **조용히(silent) 재게시**.
  앱이 `postMessage({type:'SK_UNPIN',tag})`로 미리 알린 닫힘(=고정 해제)만 재게시하지 않음(15초 1회성 기억).
  `notificationclick`: 고정 알림은 탭해도 닫지 않고 앱만 앞으로 가져옴.
- **index.html**: `pinnedNotifOptions()` 공용화(data에 title/body/pinned 포함 → SW가 재게시 가능; Vault 노트는 여전히 내용 미노출).
  `closePinnedNotification()`은 SW에 SK_UNPIN 통보 → 120ms 뒤 close.
  신규 `syncPinnedNotifications()`: 고정 상태(`S.notes` + 열린 Vault의 `VLT.notes`)와 현재 알림을 비교해 **빠진 것은 다시 만들고, 더 이상 고정이 아닌 것은 닫음**(잠긴 Vault 알림은 판단 불가라 보존).
  호출 시점: SW ready 후 0.8초, 전면 복귀(`visibilitychange`) 후 0.5초. 토스트는 "상단 고정했습니다. 휴대폰 알림은 고정 해제 전까지 유지됩니다."
- 한계: OS가 알림 권한을 회수하거나 앱 데이터를 지운 경우는 복원 불가. SW가 죽어 있을 때 사라진 알림은 다음 앱 실행/전면 복귀 때 복원.

### 검토
- S5(full Chromium + 알림 권한): 고정 → tag/requireInteraction/data.pinned 확인 · SK_UNPIN 뒤 닫힘은 0 유지 · `syncPinnedNotifications()` 복원 · 고정 해제 → 0 유지 · 새로고침 후 고정 알림(m2) 유지.
- sw_unit.js(6/6): 사용자 스와이프 재게시 · 비고정 태그 무시 · SK_UNPIN 1회성 · 고정 알림 클릭 시 미닫힘.
  (스크립트 `close()`는 브라우저가 `notificationclose`를 안 주므로 이 경로는 단위 검증으로 대체.)

---

## 5) 아이콘의 작은 숫자 "1"

### 확인
- 앱 코드에 `setAppBadge`/`clearAppBadge`(배지 API) 호출 **없음**. 그 숫자는 **안드로이드 런처가 "읽지 않은 알림이 있음"을 뜻으로 자동 표시하는 알림 배지**.
- 크롬 안드로이드는 웹 배지 API를 지원하지 않으며, 알림이 떠 있는 동안 배지는 OS가 전적으로 관리 → **웹앱에서 끌 수 없음**. 4번(알림 유지)과 한 몸이다.

### 수정
- 코드 변경 없음(불가). README에 폰 설정 경로 안내 추가:
  **설정 → 애플리케이션 → Chrome(또는 설치한 soonenote) → 알림 → 앱 아이콘 배지 끄기** / 삼성: 설정 → 알림 → 고급 설정 → 앱 아이콘 배지.

### 검토
- S5: `index.html`에 `setAppBadge` 문자열 없음(앱이 배지를 만들지 않음) 확인.

---

## 기타
- `APP_VER='7.5.8'`, sw.js `VERSION="7.5.8"`(캐시 교체).
- CSP 인라인 해시 갱신: `sha256-bgVsvfBj/vTvdzP3QWyCDSPov4B3vAgJCJy6YGwx5XU=` (index.html meta = DEPLOYMENT_HEADERS.txt).
