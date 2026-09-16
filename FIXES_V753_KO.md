# soonenote v7.5.3 — 수정 내역 (사용자 피드백 4건)

**일시:** 2026-09-12 · **기준본:** v7.5.2 (`/home/user/fix_v7.5.1/` = 수정 전) · **작업본:** `/home/user/fix_v7.5.1/`
각 항목을 **확인(재현) → 수정 → 검토(자동 E2E)** 순으로 처리했습니다. E2E: Playwright 실브라우저 72 체크 전부 통과.

---

## 1) Vault 자동 잠금 — "들어갔다가 나왔다가 금방 다시 들어가면 매번 암호를 다시 묻는" 문제

### 확인 (재현)
- v7.5.2는 워밍 세션(key)을 **메모리에서만** 보관했습니다.
- 재현 테스트: unlock → 나감 → `page.reload()`(실제 기기의 PWA 백그라운드/메모리 압박이 유발하는 새로고침) → 재진입 → **password gate가 다시 뜸** → 사용자 보고와 동일하게 재현 확인.
- 원인: 새로고침/프로세스 재시작 시 메모리 key가 소멸 → `VLT.open()`이 password gate로 감. 5분·30분 설정값과 무관하게 발생.

### 수정
- `sk.vault.session = {v:1, k: base64(32B key raw bits), t: deadline}` 를 **`armAutoLock()`(unlock·활동 re-arm)마다** 저장.
- 앱 시작(`VLT.init()`) 시: 암호화된 Vault가 있고 세션이 있고 deadline이 남았으면, `k`로 **암호문 전체를 AES-GCM 복호화(=키 검증) → 성공 시에만** key·notes·folders·settings를 복원하고 남은 시간으로 timer 재가동. 실패/변조/만료 → 세션 삭제 + 기존 password gate.
- `VLT.leave()`(잠김), 비밀번호 변경(`setVaultPin`), `wipe()` 시 세션 즉시 삭제. 운영 키는 non-extractable CryptoKey를 유지하고, 저장용 raw bits만 unlock/변경 시점에 PBKDF2로 별도 유도.
- 기존 v7.5.2 로직(deadline 재점검: foreground·bfcache·재진입)은 그대로 — 새로고침 후에도 `_autoUntil` 기준이라 동작.

### 검토
- E2E S1a: unlock → 나감 → **reload → 재진입: gate 없음, Vault 노트 보존** (사용자 시나리오 그대로 통과).
- S1b: deadline 지난 세션 → 시작 시 삭제, 재진입 시 **gate 표시**.
- S1c: 세션 key 1바이트 변조 → **GCM 검증 실패 → 세션 삭제, gate 표시, 본래 비밀번호로 정상 열림 (데이터 손상 없음)**.
- S1d: 비밀번호 변경 → 구 세션 즉시 폐기, reload 후 **새 비밀번호로만** 열림.
- 보안 트레이드오프(세션 기간 중 localStorage에 key 자료 존재)를 `SECURITY_NOTES_KO.md`에 명시.

---

## 2) 노트 선택 체크박스 50% 축소 + 폴더 안의 노트 선택·삭제 + 폴더 타일 롱프레스 이름 변경 제거

### 확인
- 기존 체크박스(`.note .selbox`)는 메인(#grid) 노트 카드에만 존재. 폴더 상세(`#folderDetailGrid`) 카드는 체크박스·롱프레스가 전혀 없었고(탭=편집만), 폴더 타일은 롱프레스(560ms)로 "새 폴더 이름" 입력창(dlg)이 열리는 이름 변경 기능이 있었습니다.

### 수정
- **50% 축소**: `.selbox` font-size 1.05em→0.525em, 폭 = 1.75em(작아진 em 기준) → **박스 폭은 기존 대비 정확히 50%** (0.525×1.75)/(1.05×1.75). border 3px→1.5px, 그림자 축소. 일반·폴더 상세·Vault 카드가 동일한 `.note` CSS를 쓰므로 **세 곳에 동일 적용**.
- **폴더 상세 선택**: 폴더 상세 카드에 체크박스 렌더링 + 500ms 롱프레스=선택 진입/토글, 선택 모드에서 탭=토글 (메인과 동일 로직). `selectionPool()`을 신설해 '전체 선택'/상단바 카운트가 **폴더 상세에서는 해당 폴더의 노트만** 대상이 되도록 변경. `render()`가 폴더 상세가 열려 있으면 상세 그리드를 함께 갱신(체크 상태·삭제 결과 반영). `#selMode` 바 z-index 40→58로 폴더 오버레이(z50) 위 표시.
- **타일 롱프레스 제거**: `bindFolderTileRename` 함수·호출·`.rename-armed` CSS·'길게 눌러 이름 변경' 힌트 전부 삭제. 타일 탭 = 폴더 열기만.

### 검토
- S2: 롱프레스 진입 → 실측 폭 = note font-size의 ~0.92배(=기존 50%) ✓, 탭으로 해제, 전체 선택 → 🗑️ → 2건 휴지통 이동.
- S3: 폴더 상세(일반)에서 롱프레스 → 체크박스 표시, 풀=폴더 노트 2개(전체 3개 아님), 전체 선택 → 삭제 → 상세 그리드 즉시 갱신, 메인 노트 무사, Back은 선택만 먼저 종료(한 겹).
- S4: **Vault** 메인 그리드 롱프레스 택·삭제(Vault 휴지통) + **Vault 폴더 상세** 롱프레스 선택·삭제 — 전부 통과.
- S5: 타일 680ms 롱프레스 → dlg 없음, `.rename-armed` 없음, `bindFolderTileRename` 미정의, 탭 통과로 상세 열림, 화면 어디에도 롱프레스 힌트 없음.

---

## 3) 폴더 상세 왼쪽 상단 폴더명 탭 → 인라인 이름 변경 박스 (일반 + Vault)

### 확인
- 기존: `#fdTitle` 클릭 → `renameFolderById()` → **다이얼로그**("새 폴더 이름" 입력창) 사용.

### 수정
- `startFolderInlineRename()`: 폴더명 자리에 `<input class="fd-rename">`를 놓고 **현재 이름을 미리 채워** 포커스+전체 선택.
  - **Enter 또는 blur(다른 곳 탭) = 커밋** (공백 trim, 80자 제한, 기존과 동일하면 저장 안 함)
  - **Escape = 취소**, 비어 있으면 기존 이름 유지
  - 저장은 기존 `renameFolderById`와 동일한 경로(`persistFolderState` = 일반 `save()` / Vault `VLT.persist()`) — 저장 실패 시 원복 + 토스트.
- `#fdTitle` 클릭·Enter/Space 키bindings를 인라인 편집기로 교체. 다이얼로그 미사용(검증 포함).

### 검토
- S6(일반): 탭 → `#fdTitle` 안에 input, 값='Work', 포커스, dlg 없음 → ` Team` 입력 + Enter → 제목·`S.folders` 모두 'Work Team' → hub 타일이 새 이름 표시. Escape → 취소(이름 유지). 빈 값 blur → 거부(이름 유지).
- S6(Vault): Vault 폴더 'Secret'에서 동일 플로우 → 'Top Secret' 커밋, `VLT.folders` 영속화 확인.

---

## 4) 폴더 한 줄 4개 정렬 (고정) — 일반 + Vault

### 확인
- 폴더 hub 열 수는 설정 `folderBox`(1~4, 기본 3) + ⋮ 메뉴 '보기 방식'(Grid Small/Medium/Large…)가 제어하고, 일반/Vault 공용 `renderFolderHub()`로 렌더링.

### 수정
- `renderFolderHub()`: `--folder-hub-cols`를 **항상 4**로 고정, 카드 클래스를 `view-grid-s`(컴팩트 타일) 고정. 모바일/데스크톱 모두 4열.
- '보기 방식' 메뉴 항목(열 수 의미 상실) 제거. 정렬(sort) 항목과 폴더 안 *노트* 보기 옵션은 그대로.

### 검토
- S7: 일반 hub 4개 폴더 → 4열·1행에 4타일(실측 top 좌표 일치). `folderBox='2'/folderView='grid-l'` 강제 후에도 **여전히 4열**. ⋮ 메뉴에 '보기 방식' 없음. Vault hub도 4열.

---

## 버전·배포 표

| 항목 | 이전 (v7.5.2) | **v7.5.3** |
|---|---|---|
| `APP_VER` (index.html) | `7.5.2` | **`7.5.3`** |
| `sw.js` VERSION / CACHE | `7.5.2` / `soonenote-v7.5.2` | **`7.5.3` / `soonenote-v7.5.3`** |
| CSP inline 해시 | `sha256-q1xisLeV32CvBA8N0LfcIaI9+U6gP9eqXjMhcljnXlI=` | **`sha256-hL58TG49dKikUVOOcnvhJBeVFCnQnaTufYUYMmvI1eU=`** |
| 폴더 hub 열 수 | 설정(folderBox 1~4, 기본 3) + 보기 방식 메뉴 | **4 고정 (일반+Vault), 메뉴 옵션 제거** |
| Vault 세션 | 메모리만 (새로고침 시 소멸) | **`sk.vault.session`(GCM 검증 복원) — deadline까지** |
| 선택 체크박스 | 1.75em 박스, 메인 카드만 | **50% 박스, 메인+폴더 상세+Vault** |
| 폴더 이름 변경 | 타일 롱프레스 dlg + 제목 탭 dlg | **제목 탭 인라인 박스 (타일 롱프레스 제거)** |

## 변경 파일
- `index.html` — 위 4건 코드 + 헤더 버전 코멘트 + CSP
- `sw.js` — VERSION 7.5.3
- `DEPLOYMENT_HEADERS.txt` — CSP 해시
- `README_KO.md` — v7.5.3 변경점·배포 후 확인 업데이트
- `SECURITY_NOTES_KO.md` — 세션 영속화 트레이드오프 명시
- `FIXES_V753_KO.md` — 이 문서
- `VALIDATION_KO.md` — v7.5.3 검증 결과
- `SHA256SUMS.txt` — 재생성
- `manifest.webmanifest`, `vendor/supabase.min.js`, `icons/*` — 변경 없음
