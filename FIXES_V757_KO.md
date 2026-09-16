# soonenote v7.5.7 — 수정 내역 (사용자 피드백 2건)

**일시:** 2026-09-14 · **기준본:** v7.5.6 · **작업본:** `/home/user/fix_v7.5.1/`
각 항목을 **확인 → 수정 → 검토(Playwright 실브라우저 E2E)** 순으로 처리.
v7.5.7 신규 28 체크 + v7.5.6 69 + v7.5.5 48 + v7.5.4 40 + v7.5.3 72 회귀 전부 통과 (합계 257/257).

---

## 1) Vault 바탕화면 — 파스텔톤 레드

### 확인
- 앱 배경은 `:root`의 `--bg`/`--bg2` 변수(body·폴더 오버레이 등 공용)로 제어되고,
  Vault 진입 시 `<html>`에 별도 테마 속성(`data-theme`)이 걸린다.
  Vault는 **자신의 설정**(테마·뷰·정렬)을 따로 쓰는 구조라, 바탕색도 Vault 컨텍스트의
  테마에 맞춰 적용되도록 설계했다.

### 수정
- `render()`에서 Vault 진입 시 `document.documentElement`에 `.vault` 클래스 토글 추가.
- CSS:
  - 라이트: `html.vault{--bg:#f8e4e1; --bg2:#f1d7d2}` — **파스텔 레드**.
  - 다크(Vault 테마가 dark): `html[data-theme="dark"].vault{--bg:#312422; --bg2:#3a2b28}` — 레드-브라운.
- `--bg`/`--bg2`만 바꿨으므로 노트 카드·버튼·팝업 등 나머지 UI는 그대로이고,
  Vault에서 여는 폴더 오버레이도 같은 파스텔 톤을 쓴다. Vault를 벗어나면 원래 배경으로 복귀.
- 하단 폴더바(그린 Sage 톤)는 요청 범위가 아니므로 변경 없음.

### 검토
- E2E S1 (14 체크): 비Vault 기본 배경 → Vault 진입 시 `<html>.vault` + body 배경
  `#f8e4e1`(라이트 파스텔 레드)·`--bg2` 톤 확인 → Vault에서 연 폴더 오버레이도 톤 유지 →
  Vault 테마 dark로 전환 시 `#312422` → Vault 종료 시 원래 배경 복귀.

---

## 2) 이동 화면 리스트 — 높이·아이콘·텍스트 120%

### 확인
- 이동 화면(1단계 타일·2단계 목록)의 행은 `<button>`이라 브라우저 기본 버튼 글씨(13.33px)를
 基准으로 em이 적용되는 구조(기존 "150%"가 체감 2배가 넘게 보였던 이유).
- "현재 크기의 120%"를 정확히 맞추려면 행 자체의 font-size를 1.2배로 올려야 함.

### 수정
- 이동 화면에서만 `#fhSelectList`에 `move-targets` 클래스를 다시 부여(노트 선택 목록에서는 제거):
  - `#fhSelectList.move-targets{font-size:1.2em}` — div 계열(읽기 전용 노트 행·빈 텍스트) 120%.
  - `#fhSelectList.move-targets .fh-trash-row{font-size:16px}` — 버튼 행 = 현재 13.33px의 120%.
    행 안의 **텍스트(제목 .79em·메타 .6em)·아이콘(1em/1.45em)·높이(패딩·간격 em)**가 전부
    행 font-size에 연동되어 정확히 120%로 커진다.
- 1단계 루트 타일도 같은 행 스타일이라 함께 120% 적용.

### 검토
- E2E S2 (9 체크): 리스트 글씨 = 기준의 120%, 행 글씨 = 13.33px의 120%(16px),
  제목 글씨/아이콘/행 패딩(높이)이 각각 120%임을 computed style 실측,
  읽기 전용 행도 120%, 2단계→1단계에서는 유지·노트 선택 목록에서는 클래스 제거(누설 없음).
- E2E S3: 확대된 리스트에서 폴더 드릴다운 → 이동 완료 → hub 도달 (기능 회귀).

---

## 공통
- `APP_VER` / Service Worker 캐시 버전 7.5.7, 인라인 스크립트 변경으로 **CSP 내라인 해시
  재계산**(`sha256-xNolH3bmvxAv2PjzJlef+HICZNOxCF0qN2lAqYS/i6E=`) — index.html meta와
  `DEPLOYMENT_HEADERS.txt` 동일.
- `node --check` 문법 검증, 5개 suite(pageerror 0) 전수 통과.
