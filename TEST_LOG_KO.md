# soonenote 실사용 테스트 기록 (v7.6.x, 1개월 검증 기간)

형식: **현재 문제 → 원인 → 수정 여부 → 테스트 결과**. 카테고리: BUG / UX / REMOVE(불필요 기능 제거 후보) / PERF / PRIV(개인정보·보안) / DATA(데이터 안정성) / PLAY(Google Play 배포 전 필수).

## BUG

### BUG-001 · 편집 중 내용이 앱 전환/종료 시 유실 — **수정 v7.6.1**
- 문제: 노트 편집 중(자동저장 3초 이전) 다른 앱 전환·알림 확인·화면 꺼짐·탭 닫기 → 복귀 시 입력하던 본문/제목이 사라짐.
- 원인: `visibilitychange(hidden)`·`pagehide`가 자동 백업 스냅샷만 찍고 편집기 내용(`flushEd`)은 저장하지 않은 채, 복귀 시 `resetToFirstNotesScreen()`이 편집기를 닫음.
- 수정: hidden/pagehide 시 `ui.editingId`가 있으면 `flushEd(true)` 먼저 실행.
- 테스트: verify761 S1 — 본문/제목 모두 보존 확인. "복귀 = 첫 화면" 규칙은 그대로.

### BUG-002 · 🖼 사진 링크가 실기기에서 저장되지 않음 — **수정 v7.6.1**
- 문제: 사진 선택 후 노트에 칩이 보이는 듯하다가, 다시 열면 칩이 없거나 탭 시 "세션 동안만…" 안내.
- 원인: 시스템 사진 선택기가 뜨면 웹앱이 백그라운드(`hidden`) → 복귀 시 첫 화면 초기화가 편집기를 닫고 `editingId=null` → 선택기가 돌려준 파일은 닫힌 DOM에 삽입되어 저장되지 않고, 3초 뒤 `PL.prune()`이 참조까지 삭제.
- 수정: 🖼 누를 때 `ui.pickingPhoto`(최대 3분, 완료 후 2초 유예) 동안 첫 화면 초기화 보류 · 편집기가 닫혔으면 삽입 대신 안내 · prune은 편집기 닫힌 뒤에만 · 선택 취소 감지(`cancel` 이벤트 + 포커스 복귀 1.5초).
- 테스트: verify761 S2 — 이벤트 순서 두 가지(hidden→visible→change / hidden→change→visible) 모두 칩·메타 보존, 재열기 후 사진 열림. 취소 시 편집기 유지·플래그 해제.

## UX
### UX-001 · 웹 세션 종료 후 링크 탭 문구 — **수정 v7.6.1**
- "이 사진은 휴대폰에 그대로 있습니다. 웹 버전은 사진을 고른 동안만 보여 주며, Android 앱에서는 언제든 열립니다."

## DOC · 웹 fallback의 설계상 한계 (정상)
- 브라우저는 선택한 파일의 영구 참조를 주지 않는다(File System Access API는 Android Chrome 미지원). 따라서 웹에서는 **같은 페이지 세션 동안만** 메모리 Blob으로 표시. 새로고침·브라우저 재실행 후에는 열리지 않음(테스트 E/F). Android 앱(Photo Picker + `takePersistableUriPermission`)에서 해결.

## REMOVE (후보)
- (기록 대기)

## PERF / PRIV / DATA
- DATA: 설정 → "데이터 크기"(노트 데이터 / 전체 앱 데이터) v7.6.1 추가 — 사진 링크 후 크기 증가가 수백 byte 수준인지 실사용 중 확인.

## PLAY (배포 전 필수)
- 동기화 없는 기본 버전 빌드 시 `FEATURES.sync=false` 한 줄(→ `SYNC_REMOVAL_KO.md`).
