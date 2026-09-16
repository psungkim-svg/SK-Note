# soonenote v7.5.4 — 수정 내역 (사용자 피드백 3건)

**일시:** 2026-09-13 · **기준본:** v7.5.3 · **작업본:** `/home/user/fix_v7.5.1/`
각 항목을 **확인 → 수정 → 검토(Playwright 실브라우저 E2E)** 순으로 처리. v7.5.4 신규 40 체크 + v7.5.3 회귀 72 체크 전부 통과.

---

## 1) 설정의 글자 굵기 — 500 / 600 / 700

### 확인
- v7.5.3 당시 `FONT_WEIGHTS={n:'500',b:'700',x:'900'}` (Normal/Bold/Black 3단계).

### 수정
- 맵을 `{n:'500',b:'600',x:'700'}`으로 변경 — **저장 키(n/b/x)는 그대로**라 데이터 이관 없음 (기존 700→600, 900→700으로 한 단계 가늘게 적용).
- 설정 드롭다운 라벨 5개 언어 업데이트: en Normal(500)·SemiBold(600)·Bold(700) / ko 보통(500)·중간굵게(600)·굵게(700) / ja·zh·es 동일.
- 옛 숫자값 이관지도 `600 → b(600)`로 정합화. CSS는 600/700 셀렉터가 이미 있어 변경 없음.

### 검토
- E2E S1: 맵 값 검증, 드롭다운 3개 옵션 라벨 500/600/700, 선택 시 `data-notefw` = 500/600/700, 저장 키 유지.

---

## 2) 노트 화면·폴더 화면 선택 모드: 상단바 휴지통 좌측에 이동 버튼

### 확인
- 선택바(`#selMode`)에 기존 [취소][전체][개수][복원(휴지통)][🗑️삭제]만 존재. 앱에 이미 '노트 이동' 플로우(`folderHub.select` + `selectMode='move'` + `renderFolderMoveTargets()` 대상 목록 + `moveSelectedNotes()`)가 ⋮ 메뉴용으로 존재.

### 수정
- `#selDelete` **왼쪽**에 `#selMove`(📤 이동) 버튼 추가 — `updateSelBar()`에서 선택 모드(휴지통 제외)에만 표시, 미선택 시 disabled.
- `#selMove` 핸들러: 선택된 id를 `folderHub.select`로 인계 → 폴더 오버레이/상세 상태를 정리 → **기존 '노트 이동' 화면(이동 대상 목록)을 slot 구조 [hub H, select S1, move S2] 그대로** 열도록 재현.
  - headless/실기기에서 **동시 pop→push가 history slot을 깨뜨리는** 것을 계측(dbg)으로 확인해, exitSel의 back() 커밋 후에만(60ms 지연) push하도록 처리 + 메인 화면 step-5 '한 번 더' 토스트 억제.
  - 이동 대상: 폴더 없음 / 각 폴더 / Vault(일반 모드, 기존 `startSelectedMoveToVault` 암호화 이동). Vault 안에서라면 Vault 폴더 사이 이동.

### 검토
- E2E S2: 버튼이 휴지통 바로 좌측 표시(순서 검증), 일반 화면에서 폴더로 이동 ✓, **폴더 상세에서** 선택→이동 ✓(폴더 밖으로 이동 포함), 이동 대상 목록·제목 ✓, Back 한 겹 규칙(대상→선택목록(선택 유지)→hub→main) ✓, 휴지통 모드에서 버튼 숨김 ✓, 이동 완료 후 기존 플로우와 동일하게 hub 도달 ✓.

---

## 3) 제목 없이 저장 시 '제목 없음' 저장

### 확인
- 기존: `flushEd()`가 `n.title=$('#edTitle').value`를 그대로 저장 → 내용 있음 + 제목 없음 = 데이터의 제목이 `''` (화면만 플레이스홀더 표시).

### 수정
- `untitledTitle(n)` 헬퍼 신설: 제목 공백 + 내용(note 본문 또는 check 항목)이 있으면 `제목 없음(No title)`, 아니면 null.
- `flushEd()` **최종 내용 반영 후**(본문 정화·저장 직전) 규칙 적용 — 내용 업데이트 전에 검사하던 위치 오작동 수정.
- "변경 없음" silent 저장(열었다 닫기) 경로도 동일 규칙 적용해, 과거에 빈 제목으로 저장된 노트가 다시 닫힐 때 제목 부여.
- 제목이 있는 노트·완전 빈 노트 자동 삭제 규칙에는 영향 없음.

### 검토
- E2E S3: 본문만 입력 → 저장 시 `제목 없음` ✓, 체크 항목만 → `제목 없음` ✓, 제목+본문 → 제목 유지 ✓, 완전 빈 노트 → 자동 삭제 유지 ✓.

---

## 버전·배포 표

| 항목 | 이전 (v7.5.3) | **v7.5.4** |
|---|---|---|
| `APP_VER` (index.html) | `7.5.3` | **`7.5.4`** |
| `sw.js` VERSION / CACHE | `7.5.3` / `soonenote-v7.5.3` | **`7.5.4` / `soonenote-v7.5.4`** |
| CSP inline 해시 | `sha256-q2ecqnja0ezDnsVuVrdtXsFYuAzF820FVcXB53DJ51s=` | **`sha256-ieEG1Fqfh/TnApBTul41EnwskGLTNwgFxjh2X4XtMMs=`** |
| 글자 굵기 단계 | 500/700/900 | **500/600/700** |
| 선택바 | 취소/전체/개수/(복원)/삭제 | **…+ 📤 이동(휴지통 좌측, 휴지통 모드 제외)** |
| 빈 제목 저장 | `''` (플레이스홀더만 표시) | **`제목 없음(No title)` 저장** |

## 변경 파일
- `index.html` — 위 3건 코드 + 헤더 버전 코멘트 + CSP
- `sw.js` — VERSION 7.5.4
- `DEPLOYMENT_HEADERS.txt` — CSP 해시
- `README_KO.md` — v7.5.4 변경점
- `FIXES_V754_KO.md` — 이 문서
- `VALIDATION_KO.md` — v7.5.4 검증 결과
- `SHA256SUMS.txt` — 재생성
- `SECURITY_NOTES_KO.md`, `manifest.webmanifest`, `vendor/supabase.min.js`, `icons/*` — 변경 없음
