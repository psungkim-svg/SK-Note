# SoonNote 실사용 테스트 기록 (v8.3 기능·선택 QA 포함)

형식: **현재 문제 → 원인 → 수정 여부 → 테스트 결과**. 카테고리: BUG / UX / REMOVE(불필요 기능 제거 후보) / PERF / PRIV(개인정보·보안) / DATA(데이터 안정성) / PLAY(Google Play 배포 전 필수).

## v8.3 (2026-09-12) — 미리보기 550 / 첫 화면 ⋮ 메뉴 / 편집기 간격
- 노트 카드 제목 아래 본문 미리보기의 `font-weight`를 노트별 편집 설정과 분리해 550으로 고정. 바둑판 및 제목+미리보기 화면에서 550 확인.
- 첫 화면 우측 끝에 단일 ⋮ 메뉴를 두고 기존 보기·휴지통·설정 버튼을 메뉴 항목(아이콘+이름)으로 이동. 보기 설정을 펼치면 바둑판·목록·제목과 내용 미리보기 세 방법 중 하나를 선택·저장. Vault 옵션도 동일한 ⋮ 메뉴에 합쳐 중복 버튼 제거.
- 편집기 ↶·T·사진·색상 버튼의 시각 간격을 각각 9.31~9.33 CSS px로 맞춤(간격 범위 0.02px). 320px에서도 모든 도구가 화면 안에 있고 제목 칸 115.36px, 터치 영역 겹침 없음. 한국어·영어, 320/390px 확인.
- 검증: v83_feature_regression 88/88, selection QA 25/25, UI 회귀 36/36, 반응형 24/24, 이동 UI 16/16, 업데이트 흐름 11/11, SW 단위 6/6, 오프라인 부팅/캐시 PASS. 자동화 터치 결과이며 실기 Android 확인은 별도 권장.
- CSP SHA-256: sha256-+pA6Wd9QRkx8LshoOfEG3oUUJlMIwxMshxK8fs9uhW0=; `APP_VER` / 서비스워커 `VERSION` 8.3.

## v8.2 (2026-09-12) — 노트 선택 안정화 / 전체 선택 클릭 오류
- 재현 원인 1: long-press 핸들러가 모든 pointermove에서 타이머를 취소해 작은 손가락 흔들림에도 선택 실패. 원인 2: 성공한 hold가 선택 상태로 DOM을 다시 그린 뒤 포인터를 놓으면 생성된 click이 새 노트 카드에 도달해 방금 선택을 해제하거나 편집기를 열 수 있었음. 수동 정렬의 stationary hold와 drag 경로도 분리 확인이 필요했음.
- 수정: 420ms hold, 14px jitter 허용, pending 피드백과 지원 기기의 짧은 진동; pointerup 후 동일 항목 click을 1회 소비하고 pointercancel 시 guard 해제. 메인 노트·폴더 상세 노트·폴더 타일 공용. 수동 정렬은 stationary hold=select, hold 후 이동=drag, drag 종료 click도 소비.
- 선택바에 명시적 Select notes 버튼. 기존 Select all / Move / Delete-to-Trash / Restore 기능 유지. Select all 버튼이 클릭 직후 라벨을 교체하면서 전역 배경 클릭으로 오인되던 문제를 버튼 이벤트 전파 차단으로 수정.
- 자동화 결과: v82_selection_qa 25/25 (실제 Chromium 터치 이벤트, 320/390/1024px, 1.45초 hold·jitter·release·폴더 선택·수동 sort drag), v82_ui 36/36, responsive 24/24, move UI 16/16, update flow 11/11, SW 알림 단위 6/6, 느린 네트워크 지연 중 offline boot/cache-response PASS. 물리 Android 기기에서의 체감 검증은 별도 권장.
- CSP SHA-256: sha256-iKfyP/NE3BYOEcJwhmbSopSlNHyQOm0dY7OvyuxNMhI=; APP_VER / Service Worker VERSION 8.2.

## v7.11.5 (2026-09-28) — 새 주소 이전 준비 (Cloudflare Pages / Play)
- 고정값: https://soonnote.pages.dev, 패키지 app.soonnote.notes.
- index.html: hostname==='sk-colornote.vercel.app' 일 때만 하단 고정 안내 띠(#moveBar) + 새 주소 링크. 새 주소에서는 표시 안 됨(검증: 일반 호스트 false, 옛 호스트 문구 표시, 오류 0).
- 새 파일: _headers(Cloudflare용, CSP·캐시 규칙), .well-known/assetlinks.json(패키지 이름 기입, 지문 자리 비움), GUIDE_PLAY_KO.md(단계별 안내).
- 회귀 v7106 9/9, v7104 14/14. CSP sha256-G3Ar8D+4Ze41Au8lnROV8o+tWsTnzJSxm/NjmJUKIrs=

## v7.11.4 (2026-09-28) — 시작 순서 조정 + 시작 시간 표시
- 시작: render() 먼저 → BOOT_MS 기록 → setTimeout(0)에서 makeManualNotes/purgeOldTrash/재render, scrubLegacyVaultBackups(+toast), scheduleReminders. VLT.init·applyViewBtn·세션 복원은 그대로.
- 설정 › 데이터 크기에 '시작 시간 (첫 화면까지)' 행(#stBootMs, i18n boot_ms en/ko/es/ja/zh).
- 검증: 매뉴얼 7개 유지·재시작 후 중복 없음, 오류 0; PC 측정 FCP 7.11.3 vs 7.11.4 = 167~220 vs 164~208ms(유의차 없음 — PC·소량 데이터). 회귀 v7106 9/9, v7104 14/14, v7105 10/10.
- CSP sha256-Rb1qCYU9jdRyInDD8tBFyXiNY7ttFg2bCeYo9Wh1dZM=

## v7.11.3 (2026-09-24) — 제목 굵기 600 통일
- 카드 제목 .ttl(격자·목록·제목만), 편집기 #edTitle, 폴더 카드 이름 .fn(2곳), 폴더 상세 #fdTitle(+rename), 노트 선택/휴지통 행 제목, 백업 상세 제목, .sheet h3 → 600. 실측 600 ×4.
- 시작 시 아이콘 화면 = Android PWA 스플래시(브라우저 생성) → 앱 코드로 제거 불가, 안내만.
- 회귀 v7106 9/9, v7104 14/14. CSP sha256-83kEYYOoquo3Pu6aZLwxQNc6AZul48FDcb+44jwmiZ0=

## v7.11.2 (2026-09-24) — 2·4·5번 색 맑게(B)
- HEADS_L/PALETTE_BASE #ffb5bc #ffdd99 #9befb8 #8fdaff #d3adff; COLORS #ffeaec #fff5e2 #e3fbeb #e0f5ff #f3e8ff; HI_COLORS 동일. 1·3번 유지.
- 회귀 v7106 9/9, v7104 14/14. CSP sha256-noA3RkfJGS5iGfx33Gq1wTS+3pcX69HgEy1ZRDjroYw=

## v7.11.1 (2026-09-24) — Vault 바 자간·자물쇠 원 / 맑은 5색(B)
- Vault 바: letter-spacing .04em→-.01em; 자물쇠 svg 배경 #dbe7ff 원(padding .2em) — 첫 화면·폴더 허브·폴더 상세 3곳.
- 팔레트 B: HEADS_L/PALETTE_BASE #ffb5bc #ffcd95 #9befb8 #97cdff #c5a9ff, COLORS(72% 희석) #ffeaec #fff1e1 #e3fbeb #e2f1ff #efe7ff, HI_COLORS 동일. 다크 팔레트 변경 없음. 색 번호 저장이라 기존 노트·폴더 자동 반영.
- 검증: 스크린샷(홈·폴더·설정 스와치·Vault 바), 회귀 v7106 9/9, v7104 14/14, 오류 0. CSP sha256-gTirdE62Y30vjuB2cT7VmxXge5oluEFzaMZEfb2W9tA=

## v7.11.0 (2026-09-24) — 30pt / 제목 굵기 700 / 빨강 연하게(B)
- ptClamp 상한 25→30, #stFontSel 10~30(21개). 카드 제목 .ttl 800→700(#grid.titles 포함). 빨강: 제목바 #efa9ae→#f2b8bd(흰 18%), 본문 #fbe7e8→#fbebed(72% 희석 규칙 유지), HI_COLORS 동일 갱신. 다크 팔레트 변경 없음.
- 실측: fw 700, head rgb(242,184,189), body rgb(251,235,237), 30pt 저장·--note 30pt. 회귀 v7106 9/9, v7104 14/14, v7105 10/10.
- CSP sha256-l8DdMxuTs6AZ2J9k2rvtJILQokS8eJ35Lh9Z6KWSAZc=

## v7.10.9 (2026-09-24) — 설정 박스 재배치 / 제목만 보기 선 3px
- 화면 박스 행 순서: 언어·테마·첫 화면·기본 보기·입력 노트 모양·정렬 기준·기본 노트 컬러·노트박스 크기.
- 새 박스 #secFont(h4 = font_ctrl): 크기·자간·줄간격·굵기 → 샘플 박스 맨 아래. 박스 순서: 화면 → 노트 글자 → Vault → 동기화 → 데이터(백업) → 데이터 크기.
- 제목만 보기(☰) 바 사이 선 1px → 3px.
- 저장 경로 확인: 상단 '저장' 버튼과 뒤로가기(popstate→ovCloseTop→applySettingsFromUI) 둘 다 저장(실측: Save 후 box 2/font 18/weight x, Back 후 weight n/theme dark 저장).
- 검증: 회귀 v7107 7/7, v7106 9/9, v7104 14/14, 오류 0. CSP sha256-f1QM5ndfi7T1GmD8HKGBe2HSImN7HNF4BxU0rWRCGJQ=

## v7.10.8 (2026-09-23) — 설정 순서 / 박스 개수별 미리보기 글자 / 제목만 보기
- 설정: 노트박스 크기·입력 노트 모양·기본 노트 컬러 3행을 정렬 기준 바로 아래로 이동(HTML 블록 이동만).
- 격자 보기 카드 글자(제목·내용) = 한 줄 개수 비례: 1개 160% · 2개 130% · 3개 100%(기존) · 4개 78%. CSS 변수 --cardfs (첫 화면·폴더 상세·Vault 공통, 목록/제목만 보기는 영향 없음).
- 제목만 보기(☰): .tinner 숨김, 카드 배경/테두리 제거, 바 사이 1px 선, 제목 1.2em(=150%).
- 검증: 실측 ttl 29/23.6/18.1/14.1px, body 25.6/20.8/16/12.5px; list ttl 27.2px, tinner none; 설정 순서 확인; 회귀 v7107 7/7, v7106 9/9, v7105 10/10, v7104 14/14.
- CSP sha256-HFpCjME9ftUdqoMlHaw0mk/w2edl4jrX1yPuMCwV++Q=

## v7.10.7 (2026-09-23) — 백업 보관 규칙(어제·지난주 것 남기기)
- pruneBackups: 최근 8개 전부 + 지난 7일 하루 1개 + 이전 4주 주 1개 (기존: 최신 12개만 → 몇 분 전 것들이 어제 것을 밀어냄). 용량 초과 폴백 유지.
- 백업 목록에 '오늘 · / 어제 · / N일 전 · ' 접두 표시(dayLabel).
- 휴지통 무시·복구 설명은 v7.10.5 에서 반영됨(재확인).
- 검증: v7107 7/7 (10일치 시뮬레이션 → 0,0.9,1.9…6.9일, 7/17/24/31일 전 보존), v7105 10/10, v7106 9/9, bk_ui2 A–D.
- CSP sha256-ukocBcz9vGHkrvB8StfkIhntFvD3bpenbHz7wc3VlNY=

## v7.10.6 (2026-09-23) — 언어·동기화 즉시 반영
- 언어: #stLang change 즉시 save()+reload (이전엔 설정창을 닫아야 applySettingsFromUI 에서 처리 → '안 바뀐다'로 보임).
- 동기화: pullAll/applyServer/실시간 수신 후 render() 자리 5곳에 refreshFolderPage() 추가 → 폴더 허브·상세·휴지통이 열려 있어도 그 자리에서 갱신. 설정 닫을 때도 동일 헬퍼 사용.
- 검증: v7106 9/9(언어 즉시 재시작·ja 적용·auto 복귀, 폴더 허브 개수/상세 즉시 갱신, 설정 박스 즉시 1열), v7105 10/10, v7104 14/14, v7102 6/6.
- CSP sha256-JHSZpQ5lflxmDFrstq1RTHuunFObK7w/HB57Jb5hbH0=

## v7.10.5 (2026-09-23) — 백업은 휴지통 무시 / 복구 설명 문구 / 설정 즉시 반영 점검
- 백업(buildBackup): 휴지통 노트·지운 폴더는 백업에 넣지 않음. 복구(applyBackup): 예전 백업 안의 deleted 노트도 무시. 목록 개수·상세 목록도 휴지통 제외.
- 복구 화면 안내문 + 확인창 문구: '선택한 것만 복구' = 체크한 노트를 그 백업 당시 내용으로 되돌림(지금 내용은 [복구 전] 사본), '모두 복구' = 없는 노트 추가 + 백업이 더 새로운 것만 갱신, 지우지 않음.
- 설정 즉시 반영: 테마·박스 크기·글자 설정은 이미 change 즉시 적용됨(PASS). 폴더 화면이 열린 채 설정을 닫을 때 폴더 상세 그리드 재렌더 추가. 나머지 '나갔다 들어와야 바뀜' 은 실기기 재현 정보 필요.
- 검증: v7105_tests 10/10, 백업 A/B/C/D, v7104 14/14, v7102 6/6, v7101 8/8.
- CSP sha256-um8B5cXovfhNQ2OtQtFmZcYmgydSkhUbAfis/LVIWK4=

## v7.10.4 (2026-09-23) — 새 아이콘 / 언어 선택 6가지 / 매뉴얼 언어 추종 / 비밀번호 눈·간격 / 초대 코드 박스
- 아이콘: icons/ 3개(192·512·maskable) 사용자 제공 파일로 교체(노란 배경 S NOTE). manifest 변경 없음.
- 언어: 설정 → 언어 select 6개(시스템 언어/English/Español/한국어/日本語/中文). S.settings.lang('auto' 기본). 바꾸면 저장 후 앱 재시작. auto 이면 시스템 언어, 5개 밖(예: 독일어)이면 영어. 번역 없는 문구는 영어(L()/t() 기존 규칙 확인).
- 매뉴얼: 언어가 바뀌면(시스템 또는 설정) 사용자가 고치지 않은 매뉴얼 노트는 새 언어 내용으로 갱신, 폴더 이름도 함께. (기존엔 _manualHash===undefined 가드 등으로 설치 시 언어에 고정 → 선생님 관찰이 정상 동작이었음. 이제 따라감)
- 비밀번호: input[type=password] 점 간격 .55em→.18em. acPass/pinNew/pinNew2/dlgInput 오른쪽 눈(표시/숨김) 버튼 자동 부착(Vault 잠금 화면은 기존 눈 유지). 창 닫히면 자동 숨김 복귀.
- 초대 코드(dlgInput) 배경 #fff·글자 #111.
- 검증: v7104_tests 14/14(en 설치→ko 전환 시 매뉴얼 한국어, 6개 순서, 설정 고정 en/ja/auto, de→en, 눈 4곳 토글, 흰 박스·간격, manifest, 오류 없음). 회귀 v7102 6/6, v7101 8/8, v797 9/9, v795 12/12, Vault 잠금 4/4, 백업 A/B/C/D 재확인. 실기기: 아이콘은 재설치 시 반영.
- CSP sha256-U3Inj2h8jeW+AXjdMg+JHLP+gmsZxzLXdKEvwiWYp7E=

## v7.10.3 (2026-09-23) — 백업 '복구' 규칙 수정 (같은 폰에서 되돌리기 가능)
- 원인(실제 버튼 경로로 재현): applyBackup 이 '기기 노트가 있고 더 최근이면 손대지 않음' → 같은 폰에서 (A) 망친 노트를 체크해 복구, (B) 휴지통 노트를 전체 복구로 살리기 모두 '추가 0·갱신 0'. 백업 파일 자체는 정상(노트 모두 포함). 새 폰/초기화(C)만 됨.
- 수정(applyBackup 만): ① 골라서 복구 = 고른 노트를 무조건 백업 내용으로 되돌림 + 휴지통이면 살림 + 현재 내용이 다르면 '제목 [복구 전]' 사본 보존. ② 전체 복구 = 기존 규칙 + 휴지통인데 백업엔 살아 있으면 살림. ③ 0·0 이면 '(모든 노트가 이미 백업과 같거나 더 최신입니다)' 안내.
- 검증(bk_ui2.js, 실제 설정→백업→복구 목록→체크→버튼): A 회의록 '원래 내용 1' 복귀 + [복구 전] 사본 1 / B 장보기 살아남, 사본 중복 없음 / B2 변경 없음 → 0·0+안내 / C 초기화 후 2개 복귀 / D 📥 파일 가져오기(전체)로 휴지통 노트 살아남. 스크린샷 bk_v7103.png. v7102 6/6, Vault 잠금 4/4.
- 동기화·Vault·저장 형식 변경 없음. CSP sha256-RmQIQu45/4yJe8QZS6G3fqNHjWtBx5BCo5Sj9/2WDBg=

## v7.10.2 (2026-09-23) — 동기화 초대 코드(웹 배포 전용)
- `const SYNC_INVITE='snote2026'` + `inviteOk()`(5줄) + 로그인/가입 핸들러 첫 줄 `if(!await inviteOk())return;`. 맞는 코드는 기기(sk.invite)에 기억 → 다시 묻지 않음. 이미 로그인된 기기는 영향 없음. Play 판: SYNC_INVITE 를 '' 로 → 즉시 해제.
- 한계(기록): index.html 평문 — 작정한 사람은 소스에서 찾을 수 있음. 우연한 사용 방지용.
- 검증: v7102_tests 6/6(취소·틀린 코드 차단·맞는 코드 진행+기억·재질문 없음·비밀번호형 대화상자·오류 없음), v7101 8/8, v797 9/9, v795 12/12, Vault 잠금 4/4. CSP sha256-Q/MGV6miHABFVzS38ym8Z5RLBcMEXYmfrPBXkXh+Qts=

## v7.10.1 (2026-09-22) — 이름 SoonNote / 폴더 ＋ 아래로 / 매뉴얼 폴더명 다국어 / 노트 4개 복제 버그 수정
- 앱 이름 soonenote→SoonNote: index.html 19곳(title, APP_NAME, 5개 언어 app_name·rm_hint, 설정 표시, 백업 파일 설명, RLS 주석), manifest name/short_name(홈 화면 아이콘 이름), sw.js 주석·캐시 이름. 저장 키(sk.*)·백업 형식(app:'sk-note')은 그대로 → 데이터 호환.
- 폴더 화면 #fhFab bottom 1.27em→.35em (52px→19px). 허브·상세·Vault 공통.
- 매뉴얼 폴더 이름: 시스템 언어(ko 매뉴얼 / ja マニュアル / zh 手册 / 기타 Manual). 기존 폴더가 이들 이름 중 하나면 언어 변경 시 자동으로 바뀜(사용자가 직접 바꾼 이름은 유지).
- [버그] 음성/연속 입력 중 같은 노트가 '[다른 기기 · 사본]'으로 여러 개 생김. 원인: pushDirty 가 업로드 후 _srvSeen 에 '지금 로컬 내용' 지문을 기록 → 업로드 왕복 중 내용이 더 바뀌면 서버 내용과 어긋남 → 다음 push 가 다른 기기 수정으로 오판해 사본 생성(가짜 서버로 1기기 재현: 12회 입력 → 2개). 수정: 실제 보낸 행의 지문을 기록하고, 그 사이 바뀐 노트는 dirty 유지+pending 으로 이어서 전송. 재현 스크립트 결과 1개. 진짜 다른 기기 충돌은 여전히 사본 1개 보존.
- 검증: v7101_tests 8/8, dup_repro3(연속 입력)=1개, dup_repro(실충돌)=사본 1개, v799 10/10, v797 9/9, v795 12/12, v794 11/11, Vault 잠금 4/4. 실기기 확인 필요: 홈 화면 아이콘 이름은 재설치(또는 Chrome 앱 정보 갱신) 후 반영, 동기화 켠 상태로 음성 입력 재시험.
- CSP sha256-AW1QM0lAHl0Wv93kxyKz8ZWhosF3zEZwztdVikUO5g8=

## v7.10.0 (2026-09-22) — 하단 바 115% + T 서식 바 하단 고정
- 하단 바 높이 115%: #folderNav 일반 35.4→40.7px, Vault 59.5→68.6px(위·아래 여백만 증가, 칩/＋ 크기 그대로). 폴더 화면은 하단 바가 없음(v7.9.9).
- T(서식) 창: 떠다니는 박스 → 화면 아래 하단 바 자리에 가로 전체 바. B · U · ● 빨강 · ● 파랑 한 줄 중앙 정렬. 이동 손잡이 숨김(드래그 코드는 그대로, 사용 안 함). 키보드가 뜨면 visualViewport 로 줄어든 높이(--tpkb)만큼 위로 이동(tpFollowKeyboard). 서식 적용 로직·선택 유지·닫기(T 재탭/Back/바깥 탭) 변경 없음.
- 검증: 바 높이 계측(115% 정확), T 바 left/right 0·bottom 0·4개 요소 한 줄·키보드 300px 시뮬레이션 시 bottom 300, 콘솔 오류 없음. v799 10/10, v797 9/9, v795 12/12, Vault 잠금 4/4. 실기기 확인 필요: 삼성 키보드에서 T 바가 키보드 바로 위로 올라오는지(WebView visualViewport), 115% 체감.
- CSP sha256-QsZlHnbqnmssj3RDAU5UWHgksbTwfjD2AA37o2k7fN0=

## v7.9.9 (2026-09-22) — 🔐 위치 / 폴더 하단 바 제거 / 폴더 꾹 눌러 선택 / ＋ 위치 통일
- 첫 화면 아래바: 🔐 칩을 별도 오른쪽 고정 묶음(.pinrow.vaultpin, margin-left:auto)으로 → 맨 오른쪽, ＋ 바로 아래(중심 차 16px).
- #fhBottomBar display:none — 폴더 화면·폴더 상세·Vault 폴더 화면 하단 바(일반 노트/Vault 폴더 버튼) 모두 제거. HTML/핸들러는 남겨 둠(코드 삭제 없음).
- 폴더 카드: '노트:N' 탭 선택 제거 → attachFolderCardSelection: 500ms 꾹 누르면 선택 모드+체크, 선택 모드 탭=토글, 평소 탭=열기. 삭제 버튼은 기존 trashSelectedFolders(휴지통) 그대로.
- #fhFab right .7em / bottom 1.27em → 첫 화면 #fab와 동일 좌표(right 24px, bottom 52px @400x800).
- 검증: v799_tests.js 10/10, v797 9/9, v795 12/12, Vault 잠금 4/4. 실기기 확인 필요: 꾹 누르기 500ms 체감, 스크롤 중 오작동 없는지(pointermove로 취소됨).
- CSP sha256-4mv+nA15x+cQGIjgrJVliKreKoyi0HKIL4moDyeRXkw=

## v7.9.8 (2026-09-21) — Vault 띠 색 #0000FF
- .vault-unlocked,#vaultUnlockedBar 배경 #1f4e8c → #0000ff (경계선 #0000cc). 메인·폴더 화면·폴더 상세 3곳 동일(같은 규칙 1줄).
- 검증: v797_tests.js(색 기대값 갱신) 9/9. CSP sha256-uSaMtOMpooPvhdjMUaT8jyEikqUp5oy20i47Rbqwbhc=

## v7.9.7 (2026-09-21) — 매뉴얼 항상 재생성 + Vault 띠 파랑
- makeManualNotes: 매 부팅마다 매뉴얼 폴더를 보장하고 **없는 매뉴얼 노트는 항상 폴더 안에 다시 만든다**(사용자 요청: 업데이트 후 폴더 안에 7개가 반드시 있어야 함). 폴더째 지워도 다음 실행 때 다시 생김. 사용자가 고친 노트(dirty)는 유지, 다른 폴더로 옮긴 노트도 유지.
- Vault 해제 띠(.vault-unlocked, #vaultUnlockedBar): 녹색→파랑 #1f4e8c, 글자 900. 폴더 화면·폴더 상세의 띠는 상단바에 밀착(gap 0), 좌우도 상단바와 동일 폭(Vault 시트의 붉은 테두리 안쪽 끝까지).
- 검증: v797_tests.js 9/9(재생성 3경로·중복 없음·색/굵기/위치), v795 12/12, Vault 잠금 4/4, v793 28/31(실패 3건은 '녹색' 기대값의 이전 테스트 → 이번 변경으로 의도된 실패). CSP sha256-KUYFydqTw6ysejFQQ1UxG6bdQRbzkOxzRY/A7QWbkYI=

## v7.9.6 (2026-09-21) — 폴더 카드 볼드 복귀 + '노트:N' 통일
- 폴더 카드 이름(.74em)·개수(.66em) 둘 다 굵게(800). 크기는 v7.9.5 그대로.
- 개수 문구 '노트 개수:N' → '노트:N' — 폴더 카드, 이동 화면 폴더 목록(일반·Vault) 3곳 모두. (매뉴얼 본문 속 '노트 개수'라는 설명 문장은 UI 라벨이 아니라 그대로 둠)
- 검증: v795_tests.js(갱신) 12/12, v793 31/31. CSP sha256-R01Moo+itZwQ/Quq3g0LWJgr8XGlYn2tjboZ9Ff/s1o=

## v7.9.5 (2026-09-21) — 폴더 추가 팝업 / 폴더 카드 글자 / 아래바 통일 / 이동 목록 개수 우측
- 폴더 추가: 상단 줄 대신 아래에서 올라오는 팝업 시트(뒤 화면 어둡게, 제목 '새 폴더 만들기', 입력창·색상·추가·✕). HTML/JS 흐름 동일(같은 #fhAddRow), CSS만 추가 + 제목/버튼 문구.
- 폴더 카드: 이름 보통체 .74em(이전 개수 크기), 개수 '노트 개수:N' 보통체 .66em(이전 이름 크기).
- 아래바(첫 화면 #folderNav 칩 전부, 폴더 화면 #fhBottomBar): 글자 크기 모두 --ui×0.81 (이전 0.9 → 10% 축소, 폴더 칩 1.05em도 동일 크기로 통일).
- 이동 화면 폴더 목록: '노트 N' 개수를 이름 오른쪽 같은 줄로, .6em→.74em·700.
- 검증: v795_tests.js 12/12, v794 11/11, v793 31/31, Vault 잠금 4/4. 실기기 확인 필요: 팝업이 키보드 위로 올라오는지(fixed bottom — Android WebView는 보통 viewport가 줄어 올라옴), 아래바 축소 체감.
- CSP sha256-TO+ah4jPzlbgUjESPsKiBuAhUJSmFZaY1+IfFVLyyD0=

## v7.9.4 (2026-09-21) — 매뉴얼 폴더 보장 + 이동 폴더 리스트 150%
- 원인: (1) 백업 파일에 매뉴얼 폴더 표시(_manual)가 저장되지 않아 복구 후 매뉴얼 폴더를 못 알아봄 → 노트가 폴더 밖/폴더 중복. (2) '골라서 가져오기'는 폴더를 가져오지 않아 매뉴얼 노트가 없는 폴더 id를 가리킴. (3) makeManualNotes가 manualVer≥2면 아무것도 안 해서 한 번 어긋나면 영구 유지.
- 수정(index.html): makeManualNotes 매 부팅 실행 — 매뉴얼 폴더(_manual 또는 이름 '매뉴얼'/'Manual') 보장, 폴더가 비었거나 없는 폴더를 가리키는 매뉴얼 노트를 폴더 안으로, 중복 매뉴얼 노트(수정 안 한 것만)·빈 여분 매뉴얼 폴더 정리. 사용자가 다른 폴더로 옮긴 매뉴얼 노트는 그대로. 매뉴얼 폴더째 지운 사용자에게는 다시 만들지 않음.
- buildBackup/applyBackup: 폴더 _manual 표시 저장·복원, 전체 복구 직후 makeManualNotes 실행.
- releaseFolderNotes: 매뉴얼 폴더를 휴지통에 넣으면 안의 매뉴얼 노트도 휴지통(사용자 승인). 일반 폴더는 기존대로 '노트'로 이동.
- 이동 화면 폴더 리스트 120%→150% (#fhSelectList.move-targets 1.5em / 행 20px) — 아이콘·제목·개수·행 높이 함께.
- 검증: v794_tests.js 11/11 PASS (초기/폴더 비움/표시 없는 폴더/사용자 이동 존중/백업 표시/전체 복구/골라서 가져오기/매뉴얼 폴더 휴지통/재시작 미재생성/일반 폴더 휴지통/오류 없음), v793_tests.js 31/31, v792_lock 4/4, sw_boot PASS. 실기기 확인 필요: 이동 리스트 150% 체감 크기, 실제 동기화(Supabase) 후 매뉴얼 폴더 인식(이름 매칭).
- CSP sha256-j5qz5T17IHCtFIGJqTj4HQNHb4+bhjmhLmuvq9/AIXQ=

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

### UX-002 · 노트 상단바 통일 (S · 제목 · ↶ · T · 🖼 · 칼라 · ⋮) — **수정 v7.6.2**
- 문제: 보기/편집 모드가 나뉘어 ✓·연필이 번갈아 보이고, 노트마다 상단바가 달라 보임. 새 내용을 넣고 ✓를 눌러야 저장되는 것처럼 느껴짐.
- 원인: `ui.edEdit=false`(보기 모드 기본) + `.edbar.editmode` CSS로 도구 표시를 전환하던 구조.
- 수정: 항상 편집 모드(`ui.edEdit=true`). ✓/연필/`#edDone` 제거, 상단바에 S 배지 추가. 자동 저장 대기 3초 → **0.6초**(타이핑이 멈추면 바로 저장; 앱 전환 시 즉시 저장은 v7.6.1 그대로).
- 기존 데이터 영향: 없음(저장 형식·DB 변경 없음). 뒤로가기 = 저장 후 목록(변함 없음).
- 테스트: verify762 1·2 — 상단바 순서 7개 정확, 연필/✓ DOM에 없음, 입력 1초 내 저장, 편집기 S 배지 응원 말풍선.

### UX-003 · T 박스 간소화 — **수정 v7.6.2**
- Italic · 파랑 · 초록 제거 → **B U | 빨강 ⊘**, 폭 168→128px. 이미 기울임/파랑/초록이 적용된 기존 노트 내용은 그대로 표시됨(제거는 팔레트에서만).
- 테스트: verify762 3, verify759 3(2개 버튼 기준으로 갱신).

### UX-004 · 제목 탭 동작 — **수정 v7.6.2**
- 한 번 탭 = 커서만, 350ms 안에 두 번 탭 = 전체 선택(데스크톱 더블클릭 동일).
- 테스트: verify762 4.

### UX-005 · 폴더 화면 색 구분 — **수정 v7.6.2**
- 폴더 허브/폴더 상세 상단 바: `--accent2` 진한 배경 + 흰 글자(다크: #6e5b54). 폴더 카드의 "노트 N" 부분: 진한 배지(흰 글자)로 아이콘과 구분.
- 테스트: verify762 5(허브·상세 모두).

### UX-006 · 안내(토스트) 표시 시간 — **수정 v7.6.3**
- 문제: "이 사진은 휴대폰에…" 같은 안내가 너무 빨리 사라짐(2.2초/긴 문장 4.2초).
- 수정: v7.6.3 6.6/13.2초 → **v7.6.4 확정: 5초 / 긴 문장 8초**. 새 안내가 뜨면 이전 것은 바로 교체(변함 없음).
- 테스트: verify763 1 — 5.5초·11초 뒤에도 표시 확인.

### UX-007 · ↶ Undo · T 110% 확대 — **수정 v7.6.3** (verify763 2)

### UX-008 · 폴더 상단바 = 노트 상단바 규격 — **수정 v7.6.3**
- 양옆·위 끝까지 채움(아래 그린 배경이 보이지 않음), 높이는 노트 상단바(.edbar) 실제 높이를 읽어 동일하게(`--fh-bar-h`), 색은 살짝 짙은 그린 #a6cba2(Vault: 짙은 파스텔 레드, 다크: #4f6b4c). 폴더 안의 노트는 일반 노트와 같은 상단바 레이아웃.
- v7.6.2의 "노트 개수 진한 배지"는 유지.
- 테스트: verify763 3 — 허브·상세 모두 left 0/right 100%/top 0, 높이 차 <1px, 폴더 안 노트 상단바 7요소 동일.

### UX-009 · S 배지 흰색 테두리 — **수정 v7.6.3** (`box-shadow 0 0 0 2px #fff`, 첫 화면·노트 상단바 공통; verify763 4)

### UX-010 · 폴더 이름 변경 박스 — **수정 v7.6.5**
- 밑줄만 있던 투명 입력칸 → 노트 제목과 같은 흰 박스·검은 글씨(`#fdTitle .fd-rename`). 저장 경로 변경 없음.

### UX-011 · 폴더 안 노트 카드 하단 브라운 — **수정 v7.6.5**
- `#folderDetailGrid .note .thead`를 flex order로 카드 맨 아래로 이동, 배경 `--accent2`(브라운) 흰 글자. 첫 화면 카드는 그대로. 선택 체크박스는 하단으로.
- 테스트: verify765 — 입력칸 배경 흰색/글자 #212121, 폴더 카드 thead가 tinner 아래·배경 accent2, 첫 화면 카드는 변화 없음.

### UX-011 정정 · v7.6.6 — 사용자 의도 오해로 원위치(폴더 안 카드 = 첫 화면과 동일).
### UX-012 · 폴더 카드 하단 1/4 갈색 블록 — **v7.6.6** (`.fh-folder .fc` height 25%, 좌우 끝까지)
### UX-013 · 폴더 상세 제목 상시 흰 박스 — **v7.6.6** (`#fdTitle` 기본 스타일; 편집 입력칸은 v7.6.5 그대로)
- 테스트: verify766.

### UX-014 · 폴더 카드 윗부분 연한 브라운 + 위 여백 축소 — **v7.6.7** (verify767)

### UX-015 · 폴더 카드 이름 아래 여백 제거 — **v7.6.8** (사용자 미리보기 승인 후 적용; verify768)

### UX-016~022 · v7.6.9 (하단바 글자/색, 폴더 선택 삭제, 카드 그림자, 폴더 5색, 정렬 기준, 휴지통 아이콘 통일) — verify769 16/16
- 데이터: 폴더에 `color`(0~4) 필드 추가(없으면 기존 모양). 동기화 `folders.upsert`는 color를 올리지 않음(테이블 컬럼 없음 가정) → 폴더 색은 기기 로컬. 필요 시 별도 승인 후 컬럼 추가.

### UX-023~027 · v7.7.0 (칩 크기, 하단바 색, 카드 그림자, 폴더 색 점=노트 팔레트, 휴지통 크기 통일) — verify770 9/9

## REMOVE (후보)
- (기록 대기)

## PERF / PRIV / DATA
- DATA: 설정 → "데이터 크기"(노트 데이터 / 전체 앱 데이터) v7.6.1 추가 — 사진 링크 후 크기 증가가 수백 byte 수준인지 실사용 중 확인.

## PLAY (배포 전 필수)
- 동기화 없는 기본 버전 빌드 시 `FEATURES.sync=false` 한 줄(→ `SYNC_REMOVAL_KO.md`).

## v7.7.1 (라운드 25) — 동기화 최소수정 A+B
- 백업: review/backup_index_v7.7.0.html (다운로드 폴더에 index.v7.7.0.backup.html 동봉)
- 수정 함수: SYNC.toRow(+fp/applyServer 신설), SYNC.pushDirty, SYNC.pullAll, SYNC.subscribe, openEditor(1줄), edRefreshFromNote/edExternalChange 신설. DB/SQL/스키마 변경 없음.
- 테스트(review/syncdiag/simple_tests2.js, 브라우저 2개 + 모의 서버): 1 A→B PASS / 2 B→A PASS / 3 번갈아 PASS / 4 동시 PASS(사본1) / 5 B -10분 PASS / 6 B +1시간 PASS / 6-2 시계차 기본 A↔B PASS / 7 열림중 반영 PASS / 8 입력중 미덮어씀+사본 PASS / 9 반복 sync 20회 사본 증가 없음 PASS
- 회귀: verify770_e2e.js 9/9 PASS. 구 진단 스위트(run_tests.js)의 T3b/T6 "FAIL"은 버그 존재를 단언하던 항목 → 이제 버그가 재현되지 않아 실패하는 것(정상).

## v7.7.2 (라운드 26) — 배경 탭 한 단계 닫기 / 폴더 색 5색 / 폴더 색상순 정렬
- 백업: review/backup_index_v7.7.1.html. verify772_e2e.js 12/12 PASS, simple_tests2.js(동기화) 9/9 PASS, verify770 8/9(#5는 색 점 톤 변경으로 의도된 차이).

## v7.7.3 (라운드 27) — 첫 화면 설정 / 폴더 삭제 시 노트 자동 이동 / 폴더 박스 2톤 색 / 색상순
- 백업: review/backup_index_v7.7.2.html. verify773_e2e.js 11/11 PASS, verify772 12/12 PASS. CSP sha256-xbhZCGc2eZ0bPAE1tT6KDEoInfnZonDrCJpe3cIUZCM=

## v7.7.4 (라운드 28) — 폴더 파스텔 5색(FOLDER_PAL), 폴더 하단 글자 검정, Vault Unlocked 볼드+열린 자물쇠
- 백업 review/backup_index_v7.7.3.html. CSP sha256-vlaPebNzFYHhXPYS69bqoJ5rnDubvAiJSi3mzBExpos=. 색 값 검증(shot774.js) 일치; verify772/773의 색 비교 3건은 구 팔레트 기준이라 의도된 FAIL.

## v7.7.5 (라운드 29) — 앱 전체 파스텔 5색 통일(PALETTE_BASE/COLORS/HEADS/HI_COLORS), 폴더 하단 글자 확대, Vault Unlocked 확대+새 아이콘
- 백업 review/backup_index_v7.7.4.html. CSP sha256-7CUiTTVXCQ/OmiFzLAb/ZK+3gW8yp7A4bTY/zbKZY7U=. verify772 12/12, verify773 9/11(2건은 구 팔레트 값 비교 → 의도됨).

## v7.7.6 (라운드 30) — 하단 칩 90%, T창 선택 하이라이트 유지(data-tpsel 표시 span, 저장 시 제거), OS 선택 바 숨김, "이동", 토스트 3/6초
- 백업 review/backup_index_v7.7.5.html. CSP sha256-Lk5WBi/BIdKXZOcYi645xqSEfxJqj3MXrs3RNsmZO3M=. verify776 10/10, verify772 12/12.

## v7.7.7 (라운드 31) — 동기화 슬림화: 앱 재시작도 증분(lastPull+lastPullUid), 24시간 여유 제거(gte lastPull), toRow updated_at ≥ 서버최대+1(_srvMax), 휴지통 정리 DELETE 하루 1회
- 백업 review/backup_index_v7.7.6.html. CSP sha256-acoEhnaGYVvdfwBbXxej8rfAtrpodhMETq93608fxLs=. simple_tests2 9/9, restart_skew 9/9, audit_pull 로그 확인, verify776 10/10, verify772 12/12.

## v7.7.8 (라운드 32) — Realtime 정상(SUBSCRIBED)이면 60초 polling 없음(SYNC.rtLive), 끊김 중에만 60초 보정, 재연결 시 syncNow 1회
- 백업 review/backup_index_v7.7.7.html. CSP sha256-cGiJAKto7t+vuDs1EUOSvZ8mnLtI/4vUqfYlVViiHAs=. rt_tests 15/15, simple_tests2 10/10, restart_skew 9/9, verify776 10/10, verify772 12/12. 모의 서버에 SSE Realtime 추가(mock_server /rt, fake_supabase channel).

## v7.7.8 1차 청소 (cleanup, 기능 변경 없음)
- 백업: index.v7.7.8.backup-before-cleanup.html, sw.v7.7.8.backup-before-cleanup.js
- 삭제: 미참조 함수 8개(applyTypeFontSize 35줄, applyTypeLh 19, bindTypeSlider 15, setFolderBox/setFolderNoteBox/setFolderNoteSort/setFolderView/setSafeHTML 각 1줄) = 74줄 + updateTpVals 죽은 슬라이더 3줄 = 77줄
- index.html 6889줄/473,677B → 6812줄/469,934B. sw.js VERSION 7.7.0 → 7.7.8. CSP 해시 갱신.
- 회귀: simple_tests2 10/10, restart_skew 9/9, verify776 10/10, verify772 12/12, rt_tests 15/15 (모두 이전과 동일)
- 기능 스모크(cleanup_smoke.js): 부팅/기존노트/새노트/편집+T창/저장/삭제·복원/폴더/검색/체크리스트/Vault/설정/사진모듈/재시작/offline→online 전부 PASS, 콘솔 오류 0

## v7.7.9 — 노트 글자 짙은 검정 + 굵기 700/800/900 + 줄간격 1.25 (승인 후 적용)
- 백업: index.v7.7.8-clean.backup-before-font.html
- 변경: --text #3a3430→#000000(라이트; 다크 유지) · FONT_WEIGHTS n/b/x 500/600/700→700/800/900 · --notefw 700 · data-notefw=800 규칙 추가 · --notelh/DEF/VAULT_DEF fontLh 1.05→1.25 · lhMigrate125(): 저장값이 1.05/미설정일 때만 1회 1.25로(fwVer=4), Vault 설정 포함 · 설정 라벨 5개 언어 숫자 제거 · APP_VER/sw 7.7.9 · CSP 재계산
- 부수 수정: execTypeCmd('bold') — 기본 700이라 execCommand가 볼드를 해제하던 문제 → 명령 중에만 본문 굵기 400 (verify776 B 테스트 회귀 → 10/10 복구, bold_toggle.js on/off PASS)
- 테스트: font_tests 14/15(라벨 ko 항목은 프로브 방식 문제, font_lang.js 5개 언어 PASS) · verify776 10/10 · verify772 12/12 · simple_tests2 10/10 · restart_skew 9/9 · rt_tests 15/15 · cleanup_smoke 15/16(6번은 숨김 오버레이 innerText 프로브 오탐, 기존과 동일)

## v7.8.0 — 굵기 복원(500/700/900)·신규 기본 14pt·설정 자동저장/스침 방지·첫 화면 유지·노트 정보·이동·URL 즉시 링크·Vault 8자
- 백업: index.v7.7.9.backup.html
- 1 FONT_WEIGHTS n/b/x 500/700/900, --notefw 500, --text #000 유지, DEF/VAULT_DEF font '14'(신규만), 슬라이더 HTML 초기값 14/0/1.25
- 2 슬라이더: pointerdown/keydown으로 '잡은' 경우에만 input/change 반영(스크롤 스침 무시), applySettingsFromUI는 슬라이더 재독 안 함, Back(ovCloseTop)으로 닫아도 applySettingsFromUI 저장
- 3 resetToFirstNotesScreen 끝에서 startScreen(notes/folders) 재적용
- 4 buildKebab: '이동'(공유 위, startMoveFlow 재사용) · '노트 정보'(체크리스트 전환 아래, showNoteInfo → dlg)
- 7 #edBody keydown Enter: 커서 앞 URL을 a.nlink로 즉시 변환
- 8 Vault 최소 8자: setVaultPin/설정/최초 생성/레거시 이전 4곳 + 5개 언어 문구
- 테스트: v780_tests 20/21(4a는 프로브가 SVG 아이콘 항목 텍스트를 trim 비교한 오탐 — 실제 순서 '이동|공유|체크리스트 전환|노트 정보' 정상) · pw8 PASS · verify776 10/10 · verify772 12/12 · simple_tests2 10/10 · restart_skew 9/9 · rt_tests 15/15 · font_lang PASS · cleanup_smoke 15/16(기존 오탐) · bold_toggle: bold on/off 정상(프로브의 cs==700 기대치만 500으로 바뀜)
- 6 튜토리얼: TUTORIAL_DRAFT_KO.md 초안만(미삽입)

## v7.8.1 — 첫 설치 튜토리얼 폴더/노트
- 백업: index.v7.8.0.backup.html
- makeTutorialOnce(): 노트0·폴더0·tutorialMade 없음 → '튜토리얼'(5번색) 폴더 + 'SoonNote 사용 설명서'(15항목, 제목 탭/더블탭/폴더 이름 탭 포함) + '체크리스트 사용해 보기'(5항목). 기존 사용자는 플래그만. 삭제 후 재생성 없음. en UI는 영어.
- 발견/수정: 두 기기가 각자 만든 튜토리얼이 동기화로 중복 → 튜토리얼은 로컬 전용(dirty:false,_synced:true,_tutorial:true), 서버 업로드 0건 확인. 사용자가 편집하면 그때부터 일반 노트로 동기화.
- 테스트: tutorial_tests 7/7 · simple_tests2 10/10(하네스가 로컬 튜토리얼 제외하도록 1줄 수정) · restart_skew 9/9 · rt_tests 15/15 · verify776 10/10 · verify772 12/12 · v780 20/21(기존 프로브 오탐)

## v7.8.2 — 부팅 지연 제거 · 자간 0 반고정 · Vault 글자 설정 공통화
- 백업: index.v7.8.1.backup.html, sw.v7.8.1.backup.js
- 1 sw.js: HTML 네트워크 우선 → 캐시 즉시 응답 + 백그라운드 갱신(stale-while-revalidate). 1.5초 네트워크 지연 상황에서 DOMContentLoaded 40ms (이전엔 네트워크 대기). 새 버전은 다음 실행/백그라운드 전환 시 반영(기존 swApplyUpdate).
- 2 lsClamp: |v|<0.15 → 0 (±0.1은 0으로 붙음), 슬라이더에 0 눈금(datalist).
- 3 typoSettings()=S.settings: applyPrefs/applyEditorWeight/설정 UI/슬라이더 저장 모두 공통. 원인: Vault 모드에서 curSettings()가 VLT.settings(자체 기본 14/0/1.25)를 읽어 일반 설정과 달랐음. Vault 전용(자동 잠금·보기·기본색)은 그대로.
- 테스트: v782 10/10 · sw_boot PASS · v780 20/21(기존 오탐) · tutorial 7/7 · verify776 10/10 · verify772 12/12 · simple_tests2 10/10 · restart_skew 9/9 · rt_tests 15/15

## v7.8.4 (2026-09-18) — "7.8.2에서 업데이트가 안 됨" 수정
- 원인: v7.8.2에서 HTML을 캐시 우선으로 바꾸면서, 서비스워커가 새 파일을 받을 때 브라우저 HTTP 캐시를 그대로 썼다. 호스팅이 index.html/sw.js에 Cache-Control(수십 분~시간)을 주면 새 SW 설치 때 '옛 index.html'을 새 캐시에 담아 버전이 그대로 보임(재현: max-age=3600 서버에서 첫 실행 7.8.2 유지).
- 수정: sw.js 설치 시 cache:'reload', 백그라운드 갱신 fetch cache:'no-cache'; register(...,{updateViaCache:'none'}) + 시작 시 reg.update().
- 검증(HTTP 캐시 1시간 서버): 7.8.2→7.8.4 첫 실행에 7.8.4 / 7.8.4→7.8.5 첫 실행에 7.8.5. v783_tests 10/10, sw_boot PASS, tutorial 7/7. CSP sha256-fKkq+cGsP35FVq1Pdk4WuU/mvJcdiw/QzyITS5Vq/E4=
- 호스팅 권장 헤더 추가(DEPLOYMENT_HEADERS.txt): index.html/sw.js/manifest → Cache-Control: no-cache

## v7.8.5 (2026-09-19) — 백업 A+B+D (승인 범위만)
- A: 📤 내보내기 — PC: 위치 선택창(기존) / 폰: navigator.share 파일 공유(Drive·메일 등) / 둘 다 없으면 Download fallback(기존).
- B: 백업 후 결과창(파일명·노트 수·Vault 포함 여부·실제 저장 위치·"자동 백업은 기기 안만" 안내). 버튼 문구 정직화. 튜토리얼 14절 정정.
- D: Vault 미포함 시 경고창(취소 가능). 백업 목록 노트 수+🔐 표시는 기존 그대로 확인.
- 변경 없음: buildBackup / applyBackup / restoreVaultSnapshot / 백업 파일 형식(diff 확인).
- 테스트: v785_tests 4/4 + v785b_tests 10/10 (share 전달, 형식 유지, 평문 없음, 목록 표시, 파일 Import→Vault 복구→비밀번호로 복호화, Download fallback, 튜토리얼). 회귀: v783 10/10, sw_boot PASS, tutorial 7/7.
- 미확인: Android 실기기(공유 시트에서 'Drive에 저장' 실제 동작) — 사용자 확인 필요.

## v7.8.6 (2026-09-19) — ①②④ (③ Vault 화면은 미리보기만, 승인 대기)
- ①: 📥 파일 가져오기 → "전체 가져오기 / 골라서 가져오기" 선택창. 골라서 = 기존 보기/복구 화면 재사용(제목·내용 미리보기+체크). Vault는 기존 버튼(암호문 묶음). applyBackup/restoreVaultSnapshot/파일 형식 변경 없음. dlg()에 noText 옵션 추가.
- ②: 글자 크기/자간/줄간격 range → select(10~25pt / -0.5~2.0 0.1단위 / 1.00~2.00 0.05단위). 저장키 동일, 목록에 없는 기존값은 항목 추가해 유지.
- ④: '매뉴얼' 폴더 + 노트 7개(시작하기·노트 작성·폴더·Vault·백업과 복구·동기화·설정). 기존 '튜토리얼' 폴더/노트 불변. 기존 사용자도 업데이트 시 추가(manualVer). 사용자가 고친 매뉴얼은 덮어쓰지 않음. 로컬 전용.
- 테스트 v786_tests 15/15; 회귀 v785b 9/10, v783 9/10(버전 문자열만), v785 4/4, sw_boot PASS, tutorial 5/7(옛 테스트의 '노트 개수' 가정 2건 — 매뉴얼 7개 추가로 인한 예상 차이, 기존 튜토리얼 자체는 그대로).
- 미리보기: PREVIEW_vault_gate_v786.html (download/ 에도 복사)

## v7.8.7 (2026-09-19) — ③ Vault 비밀번호 화면 (승인된 미리보기대로 적용)
- 화면만 변경: 자물쇠 SVG · "Vault" 제목 · 설명 · 둥근 입력창 · 👁 표시/숨김 · 넓은 "잠금 해제" 버튼 · 인라인 오류(남은 시도 n회, 흔들림) · 다크 테마. 틀린 비밀번호 토스트는 인라인 오류로 대체(중복 방지).
- 불변: contenteditable 마스킹 입력·PBKDF2 검증·5회 잠금·암복호화·자동 잠금.
- 테스트 v787_tests 9/9 (표시/숨김 중 입력, 오류 표시/해제, 정상 해제). 회귀 v786 15/15, v785b 9/10·v783 9/10(버전 문자열만), sw_boot PASS.

## v7.8.8 (2026-09-19) — 언어 = 시스템 자동 (a–e, f 제외)
- detectSysLang: navigator.languages 순회 → 언어코드만 → SUPPORTED 일치 → 없으면 en. computeLang: 저장값(S.settings.lang) 더 이상 읽지 않음(삭제도 안 함). 설정 언어 select+change 핸들러 제거 → lang_auto 안내 텍스트.
- lang_tests 13/14: ko/en-US/es-MX/ja-JP/zh-TW/de/fr/['de','ko']/저장 lang:en+ko → 모두 기대값, undefined·번역키 0, 설정 다른 항목 정상, 재실행 유지. 1건 FAIL은 테스트 픽스처(1970년 휴지통 노트가 기존 30일 정리로 삭제) — lang_data_diff로 재검증: 수정 전/후 동일, 노트50 id·byte 동일.
- 회귀: v787 9/9, v786 15/15, v785b 9/10(버전 문자열), sw_boot PASS.

## v7.8.9 (2026-09-19) — 1·2·3·5·6 (4 취소)
- 1 목록(☰) = 제목만(첫 화면·폴더 상세 공통, CSS 2줄). 격자·제목만(≡) 보기는 그대로.
- 2 자간 -1.0~1.0 (21단계, lsClamp 범위).
- 3 ⋮ 노트박스 크기 아코디언(boxSizeAccordion 공용: 폴더 ⋮·Vault ⋮, 기본 접힘, 제목에 현재값).
- 5 Vault 게이트: 하단 안내 제거, 입력창 2.6→2.2em/글자 1.25→1.05em/자간 .28→.14em, 카드 패딩 축소 → 14자 한 줄(표시·마스킹 모두) 확인. 로직 불변.
- 6 백업 매뉴얼 8절 "Vault 백업 확인법 (가)폰 (나)Drive (다)실제 복구" KO/EN 추가, MANUAL_VER 2 → 기존 사용자도 갱신(직접 고친 노트 제외).
- v789_tests 13/14 (1건은 테스트 임계값 48px<44 — 실제 높이는 이전 대비 축소, 스크린샷 확인). 회귀: v787 9/9, v786 15/15, lang 13/14(픽스처), sw_boot PASS.

## v7.9.3 (2026-09-21) — 첫 화면 = 노트 · 폴더 하단 바 동작 · 녹색 Vault 띠
- 폴더 하단 바: [일반 노트] → 일반 모드 + 첫 화면 '노트'(nofolder). [Vault 폴더] → 첫 화면 🔐과 동일(`VLT.open()`: 잠김=게이트, 해제=Vault 첫 화면).
- 첫 화면 규칙: 🏠(folderHome), ← 일반 노트(exitView), 잠금(leave), Vault 진입(enter), 앱 시작, 복귀(resetToFirstNotesScreen) 모두 '노트'. 설정 '첫 화면'은 유지하되 기본값 '전체'→'노트'; 사용자가 '전체'를 직접 고른 경우에만 전체.
- Vault 띠(.vault-unlocked, #vaultUnlockedBar): 배경 #2f5d3a 흰 글자, 중앙 정렬. 폴더 허브·상세 띠에 첫 화면과 같은 자물쇠 SVG 추가.
- 검증: v793_tests 31/31 — 이동 12, 띠 4, 암호 7(정확/공백/틀림/대소문자 구분/5회 대기/대기 중 거부/리셋), 백업·복구 8(평문+암호문, auth 포함, 초기화, 가져오기, 복구 후 틀린 암호 거부·원 암호 해제·내용 일치). 회귀 v792 15/17(버전·'전체' 사양 변경 2건 = 의도), v792_lock 4/4, v791 8/10, v790 11/14(기존 사유), sw_boot PASS.
- 변경 파일: index.html, sw.js(7.9.3), DEPLOYMENT_HEADERS.txt(CSP), SHA256SUMS.txt. 암호 해시/키/저장 형식 불변.

## v7.9.2 (2026-09-21) — 게이트 경고문 · V노트/V폴더 아이콘 · Vault 폴더 아웃라인 · 폴더 화면 하단 바
- 게이트: 잠금 해제 버튼 높이 54→48px(약 90%, padding .55em + line-height 1.2). 버튼 아래 `gate_note`("비밀번호를 잊으면 복구할 수 없습니다.") 표시 — 기존 번역/CSS 재사용.
- Vault 하단 바: '노트'→'V노트', 📁 이모지→VFOLDER_SVG(폴더+V). 일반 노트 바 불변.
- Vault 폴더 화면(허브·상세): `.vault-folder .sheet` 2px 로즈 테두리 + radius 20 + 안쪽 3px 라인, 4px 인셋. 노트 카드 폭 손실 4px(128.3→124.3), 3열 유지.
- 폴더 화면 하단 바 `#fhBottomBar`(일반·Vault 공용): '일반 노트'(오버레이 닫고 일반 첫 화면/전체) · '[V]Vault 폴더'(잠김→게이트, 열림→Vault 허브). FAB는 바 위로. 추가 히스토리 없음(Back 한 층 규칙 유지).
- 검증(Playwright): v792_tests 17/17, v792_lock 4/4(잠김→게이트, 해제 후 Vault 진입, Back 한 층, 페이지 오류 0). 회귀 v791 8/10(버전 문자열·글꼴환경 20자), v790 11/14(동일 사유), sw_boot PASS.
- 실기기 확인 필요: 하단 바 safe-area 여백, Vault 아웃라인 색감, 삼성 글꼴에서 '일반 노트/Vault 폴더' 한 줄.

## v7.9.1 (2026-09-21) — Vault 게이트 앞뒤 공백 정합 + 키보드 자동 대문자 차단
- 원인: 비밀번호 생성 대화상자(dlg)는 `.trim()`으로 앞뒤 공백을 제거해 저장하지만 게이트 입력은 공백을 그대로 비교 → 끝에 공백을 넣어 만든 암호는 게이트에서 공백까지 치면 불일치.
- 수정: `VLT.unlockPass()`에서 `vGatePlain.trim()` (1줄). `#vGatePass`에 `autocapitalize="off" autocorrect="off"` 속성 추가(로직 변경 없음). APP_VER/sw 7.9.1, CSP 재계산.
- 검증(Playwright): v791_tests 9/10 — 정확 암호/앞·뒤 공백 붙은 암호 해제 PASS, 중간 공백·틀린 암호·공백만 거부 PASS, 실패 카운트 리셋 PASS. 실패 1건(20자 한 줄)은 v7.9.0 백업본에서도 동일 실패 → 샌드박스 글꼴 환경 차이(이전 세션 PASS), 기존대로 실기기 확인 항목.
- 회귀: v790 11/14 (실패 3 = 버전 문자열 1 + 위 글꼴 환경 2), sw_boot PASS.
- 기존 영향: 저장된 해시는 이미 trim된 값 → 기존 암호 그대로 열림. 대소문자 처리 불변.

## v7.9.0 (2026-09-19) — Vault 게이트 축소 + T창 색/하이라이트
- 게이트: "비밀번호를 입력해 잠금을 해제하세요" 제거, 입력창 높이 ~90%·글자/자간 축소 → 20자 한 줄(마스킹·표시 모두), 잠금 해제 버튼 폭 70%·높이 90%. 로직 불변.
- T창: ⊘ 제거 → 빨강+파랑 점. 같은 색 다시 누르면 검정(색 제거). 하이라이트(data-tpsel)는 T창 닫힐 때까지 유지(색/B/U 눌러도). T창 열린 동안 브라우저 선택을 즉시 접고 contextmenu 차단 → OS 잘라내기/복사 바 안 뜸. 저장 내용에 표시 span 없음.
- v790_tests 14/14. 회귀 v789/v786/v785b(버전 문자열 제외)/sw_boot PASS.

## v7.11.6 (2026-09-30)
- 변경: ① 폴더 화면·폴더 상세 상단 줄에 ⚙️ 설정 버튼 추가(#fhSetBtn/#fdSetBtn → openSettings) ② Vault 첫 화면에서 상단 ⚙️ 숨기던 1줄 해제 ③ #folderOverlay z-index 50→48 (폴더 화면 위에서 연 설정/백업 창이 가려지지 않게) ④ autoSnapshot: 강제 호출(앱 전환·pagehide)도 내용 동일하면 생략 → 몇 분 사이 같은 백업 십여 개 쌓임 해결; 백업 목록 비우기 시 sk.snapSig 초기화. CSP 재계산 9nJLEY…KPE= (index.html·_headers·DEPLOYMENT_HEADERS.txt).
- 검증(playwright, review/v7116.js) 13/13 PASS: 폴더/상세/Vault ⚙️ 표시·설정 열림·백업 목록이 설정 위·닫으면 폴더 복귀·강제 스냅샷 중복 0·page errors 0. 회귀 v7106 9/9, v7104 14/14.
- 실기기 확인 필요: 폴더 화면 상단 아이콘 6개 폭(작은 폰), Vault 상단 아이콘 간격.

## v7.11.7 (2026-09-30)
- 변경(index.html): 복귀 규칙 — 앱을 떠난 지 10분 미만이면 화면 유지(열린 노트·폴더 화면 그대로), 10분 이상이면 기존처럼 첫 화면(resetToFirstNotesScreen). Vault 자동잠금 만료 시엔 10분 안이라도 잠금+첫 화면(기존 보안 유지). 프로세스 종료 후 재시작: 떠날 때 열려 있던 일반 노트 id를 sk.lastEd에 기록 → 10분 안이면 그 노트 열기(Vault 노트·휴지통 노트 제외, 직접 닫은 노트는 기록 삭제). 추가: RESUME_MS/_hidAt/noteLeave()/onResume(), closeEditor 1줄, 시작 블록 setTimeout 1개. CSP 재계산 bnuKac…/dc=.
- 검증(review/v7117.js) 12/12 PASS; 회귀 v7116 13/13, v7106 9/9, v7104 14/14.
- 실기기 확인 필요: 홈 버튼 → 다른 앱 → 복귀(10분 내) 시 노트 유지; 최근 앱에서 밀어 종료 후 재실행(10분 내) 시 노트 열림; 10분 뒤 첫 화면.
- 텍스트 길게누르기 선택 문제: 코드상 원인 미발견(본문 user-select/touch-action 허용 상태, 길게누르기 가로채는 코드는 링크·이미지에만). 수정 보류 — 실기기 진단 필요.

## v7.11.8 (2026-09-30)
- 변경(index.html): syncPinnedNotifications — '이미 떠 있음' 건너뛰기 제거, 고정 노트 알림을 항상 다시 띄움(같은 tag 제자리 교체·무음). 복귀 5초 뒤 한 번 더 확인. 앱이 화면에 떠 있는 동안 60초마다 확인. CSP 재계산 9hNPUE…3mo=.
- 가설: '모두 지우기'로 지운 뒤 브라우저 기록상 알림이 남아 있어 복귀해도 재게시가 생략되던 것. 실기기 확인 필요(가설 미검증).
- 검증(review/v7118.js, SW 스텁) 6/6 PASS; 회귀 v7117 기능 11/11, v7106 9/9, v7104 14/14.

## v7.11.9 (2026-09-30)
- 변경(index.html): 설정 › 데이터 박스에 "📌 고정 알림 다시 띄우기" 버튼 + 상태 줄(고정 노트 수 / 알림 권한 / 서비스워커 / 표시 중 수 / 설치 앱·브라우저). 버튼: 권한 미요청이면 요청 → 고정 노트 알림 전부 재게시 → 결과 토스트(개수·오류). 차단 시 폰 설정 경로 안내. CSP 재계산 dx/bTa…fk8=.
- 목적: 실기기에서 고정 알림이 안 되는 원인(권한/SW/재게시 실패)을 사용자 화면에서 바로 확인.
- 검증(review/v7119.js) 6/6 PASS; 회귀 v7118 5/5, v7117 11/11, v7116 12/12(기능), v7106 9/9, v7104 14/14.

## v7.11.10 (2026-09-30)
- 변경(index.html 팔레트 상수 4곳): 2번 색 노랑 #ffdd99/#fff5e2 → F 크림 #f9e0b4/#fdf6ea (PALETTE_BASE·HEADS_L·COLORS·HI_COLORS). 저장 데이터 변경 없음(색 번호 그대로). CSP 재계산 NHcSnt…+jE=.
- 검증(review/v71110.js) 4/4 PASS(상수·카드 적용 rgb(249,224,180)·오류 0); 회귀 v7106 9/9, v7104 14/14.

## v7.11.11 (2026-09-30)
- 변경(index.html): ① 단어 선택: 편집 모드에서 두 번 탭/더블클릭 → enterEditAtPoint 호출 안 함(60ms 뒤 커서 재설정이 방금 생긴 단어 선택을 지우던 원인). enterEditAtPoint 내부도 선택이 있으면 건너뜀. ② T창 B/U 버튼 = 고른 글자의 실제 상태(tpSyncBIU; 열 때 회색, 적용 시 진한색). ③ 형광 하이라이트 박스 버튼(#tpHiBtn, 색 동그라미 앞) — 고른 글자 바탕 #fff200, 재탭 해제. ④ 글자색 빨강 #C62828→#FF2D55, 파랑 #1565C0→#0A84FF. ⑤ 본문 볼드 800→900. CSP 재계산 LDU3je…ccg=.
- 검증(review/v71111.js) 11/11 PASS(두 번 탭 후 선택 유지·B/U 초기 꺼짐→적용 켜짐·하이라이트 적용/해제·900·색·저장 후 정화 통과·오류 0). 회귀 v71110 3/3(기능), v7106 9/9, v7104 14/14.
- 실기기 확인 필요: 꾹 눌러 선택 / 두 번 탭 선택이 실제 손가락으로 되는지; T 바 5개 버튼 간격.
- Vault PC 미표시: 설계상 Vault는 동기화 안 됨(매뉴얼 15항) — 코드 변경 없음.

## v7.11.12 (2026-09-12) — 폴더 하단바·제목 입력칸·색 맞춤
- 변경(index.html): 첫 화면과 Vault 하단에서 '전체' 칩을 렌더링하지 않음. 폴더 허브·상세의 하단 Notes/Vault 바 다시 표시, 아래 +는 유지(폴더 추가/해당 폴더 노트 추가)하고 겹치지 않게 배치. 폴더 상단 검색·+·설정 숨김, 그리드 보기 버튼은 유지. 빈 화면 안내도 아래 +로 수정.
- 제목 굵기: 노트·폴더 이름/제목 600→800. 노트 편집기 제목 입력칸은 툴 아이콘 크기·간격을 줄이고 오른쪽으로 모아 가로폭 확보(320px에서 입력칸 51→121px). 폴더 이름 편집칸도 800.
- 폴더 SVG 색상을 카드 하단 밴드와 같은 변수로 통일. 장기누름 선택 및 삭제 확인 동작은 기존 구현이 있어 코드 변경 없이 동작 확인.
- 검증(review/v71112.js) 31/31 PASS: 320px 화면에서 하단바·그리드 아이콘·입력폭·분홍/초록 폴더색·+ 동작·첫 화면/폴더 안 노트/폴더 장기누름 선택·삭제 확인/취소·오류 0. 회귀 v7104 14/14, v7105 10/10, v7106 9/9 PASS. 실제 기기 터치 확인은 아직 안 함.
- 변경 파일: index.html, sw.js(7.11.12), _headers, DEPLOYMENT_HEADERS.txt. CSP sha256-mV1cAFzGs3aTL68sEMPecp3rWwE4DyKEGNK3/WY5UrE=.

## v8.1 (2026-09-12) — Vault 하단 V폴더 컨트롤 명확화
- Vault 하단 폴더 버튼은 금색 V-folder SVG를 유지하고 `폴더`/`Folders` 라벨을 추가했습니다. 360px 이하에서는 기존 풀사이즈 3버튼 배치를 보존하기 위해 글자 라벨만 숨기며, V 아이콘·접근성 이름(`V폴더 열기` / `Open V Folders`)과 탭 동작은 유지합니다. 일반 노트·V노트 버튼은 보존.
- APP_VER/SW VERSION `8.1`. CSP SHA-256 `sha256-IJtNPR0Rkxz8CJAweW3K+XiyTctTc7CDxWqLLR7pPgI=`; `index.html`·`_headers` 두 규칙·`DEPLOYMENT_HEADERS.txt`가 일치.
- 검증: Vault 반응형/접근성 24/24(320·390px, 영어·한국어), UI 회귀 34/34, 검색/이동 UI 16/16, 양방향 cross-store 이동 16/16, 저장 실패 롤백 5/5, 알림·리마인더 부작용 7/7, 업데이트 흐름 11/11, 코어 회귀 33/33, SW 단위 6/6. 캐시 우선 첫 화면 표시 통과(1.5초 네트워크 지연 중 DOMContentLoaded 50ms); 페이지 오류 0.
- 풀버전 ZIP `/home/user/download/Soonnote-v8.1.zip`, 제시용 복사본 `/home/user/Soonnote-v8.1.zip`. 실행 파일 9개를 패키지 최상위에 두며(중첩 `github-upload/` 폴더 없음), ZIP 무결성·9개 배포 자산 체크섬 및 소스와의 일치 확인 완료. ZIP SHA-256은 패키지 외부에서 기록.
- 실제 Android 기기의 손가락 터치 확인은 별도 필요.

## v8.0 (2026-09-12) — 검색 위치 안내·목적지 확인 이동
- 요청 반영: 검색 결과 노트를 길게 누르면 선택된 노트 제목과 실제 위치를 화면 하단에 안내(복수 선택 시 모두 표시). 하단 탐색바와 FAB를 피하고, 안내가 보일 때 본문 하단 여백을 확보.
- 이동 목적지 행을 누르면 대상을 선택만 하며 원본은 유지. 최종 목적지 선택 후 하단에 개수·위치 경로·`➡️ 이동` 버튼을 표시하고, 버튼을 누른 뒤에만 이동. 일반↔Vault와 잠금 해제 후 Vault 목적지 선택에도 같은 확정 단계를 적용. 취소/저장 실패 시 원본 보존.
- APP_VER/SW VERSION `8.0`. CSP SHA-256 `sha256-topKP8fbXHAAsq8PyjWCHQiqGxi3oBV1rClwEkZyG9E=`; index.html 메타, `_headers`의 두 규칙, `DEPLOYMENT_HEADERS.txt`가 일치. `_headers` 릴리스 주석 갱신.
- 검증: `v8_move_ui_qa.js` 16/16(검색 롱프레스·복수 위치·목적지 단계 대기·하단 확정·한국어 라벨·320px 겹침); `move_cross_store_v8_qa.js` 17개 체크포인트 통과(일반↔Vault·잠금 해제·사진 링크/세션·암호문 비노출·암호화 경고·하단 확정); 저장 실패/롤백 QA 6개 체크포인트, 고정 알림/리마인더 부작용 QA 통과.
- 회귀: UI 34/34, 반응형 20/20(320/390px·영어/한국어), 업데이트 안전 흐름 11/11, 코어 v7104 14/14·v7105 10/10·v7106 9/9, SW 단위 6/6. `node --check`, CSS 파싱(오류/경고 0), ID 중복(238개 중 0), CSP 검사 통과. `sw_boot_test.js`도 통과: 1.5초 네트워크 지연 중 캐시 제어 상태의 DOMContentLoaded 50ms.
- 풀버전 ZIP: `/home/user/download/Soonnote-v8.0.zip`, 제시용 복사본 `/home/user/Soonnote-v8.0.zip`. 배포 파일 9개, APP/SW 버전, CSP, ZIP 무결성·내부 체크섬·원본 일치 검사 완료. ZIP SHA-256은 패키지 외부에서 기록.

- 실제 Android 기기의 손가락 터치 확인은 아직 수행하지 않음.

## v7.11.18 (2026-09-12) — 위치 표시·양방향 Vault 이동 안전성
- 검색 결과와 노트 정보가 공유하는 위치 라벨을 정리하고, 사라진 폴더 안내에서 중복 아이콘을 제거.
- 일반 노트↔Vault 이동에서 활성 원본만 제거하고, 삭제 상태 노트는 휴지통에 보존. 사진 링크 메타데이터·세션 파일 전달 및 저장 실패 롤백을 유지. 성공 후 고정 알림을 새 노트 ID/저장 위치로 옮기고 리마인더 타이머를 다시 설정.
- APP_VER/SW VERSION `7.11.18`. CSP SHA-256 `sha256-a0RD8H4PEDjXYDwQJ/dYl0tkRv+PKP8b3Pf/GQMmTY4=`; index.html 메타, `_headers`의 두 규칙, `DEPLOYMENT_HEADERS.txt`가 일치. `SHA256SUMS.txt`와 `SHA256SUMS` 재생성.
- 검증: `move_qa_current.js`, `move_cross_store_qa.js`, `move_save_failure_qa.js`, `move_side_effects_qa.js` 통과(양방향 이동·사진 참조/세션·암호문 비노출·롤백·삭제 노트 보존·고정 알림/리마인더). `v71118_responsive.js` 20/20, `v71118.js` 34/34, 업데이트 흐름 11/11, 회귀 v7104 14/14·v7105 10/10·v7106 9/9, SW 단위 6/6, 캐시 우선 첫 표시 PASS. 인라인 JS와 sw.js `node --check` 통과.
- 구 v7.9.x 테스트 결과는 현 버전과 기대 동작이 달라 릴리스 게이트로 보지 않음: v794 10/11의 F2는 v7.9.7 이후 삭제된 매뉴얼 노트를 다시 생성하는 명시적 동작과 반대 기대; v795는 폐기된 `#fhAddBtn` 선택자에서 시간 초과(현재 아래쪽 `#fhFab` 사용); v799 6/10의 네 실패는 폴더 화면 하단바가 없어야 한다는 구 기대 및 이전 + 위치와 충돌(현재 v7.11에서 하단바 표시가 테스트됨). v797 9/9.
- 패키지 `/home/user/download/soonnote-v7.11.18.zip`, 제시용 복사본 `/home/user/soonnote-v7.11.18.zip`. ZIP 무결성 및 내부 SHA-256, 9개 배포 파일의 원본 일치, APP/SW 버전, CSP 검증 완료. ZIP SHA-256 `b60f31bbb11feeaa95509f85d1ce30e458de539785278410cec60ba7d9bd9766`.
- 실제 Android 기기 터치 테스트는 아직 필요.

## v7.11.17 (2026-09-12) — Vault 하단바 320px 가로 넘침 수정
- v7.11.16에서 맞춘 버튼 글자·높이·패딩은 유지. 340px 이하에서만 Vault 바 좌우 여백 `.44em→.32em`, 버튼 간격 `.3em→.14em`으로 줄여 영어 라벨에서도 스크롤 넘침 없이 배치.
- 실측: 320px 영어/한국어·390px 영어/한국어 모두 Vault 3개 버튼이 화면 안에 있고 잘리지 않음. 첫 화면 Notes/Folder와 폰트 18.36px, 높이 29.53px, 패딩 3.3048px 10.098px, line-height 22.95px 동일. 320px 영어 scrollWidth/clientWidth 306/306, 390px 370/370.
- 검증: `review/v71117_responsive.js` 20/20, `review/v71117.js` 34/34, 업데이트 안전 흐름 11/11, 회귀 v7104 14/14·v7105 10/10·v7106 9/9, SW 단위 6/6, SW 캐시 우선 첫 표시 PASS. JS 구문·CSS 파싱 오류/경고 0. APP_VER/SW 7.11.17. CSP `sha256-nj8hp7Qamvh3SlcsW4pw7R6z9Gw9Z4a4T4VbjzFlv5o=`.
- 패키지 `/home/user/download/soonnote-v7.11.17.zip` 생성·제시용 복사본 `/home/user/soonnote-v7.11.17.zip` 확인. ZIP 무결성, 9개 배포 파일 SHA-256, APP/SW 버전, CSP, 원본 파일 동일성 검증 완료. ZIP SHA-256 `8f90651c67a477fafc5b6f0bb99e298e64537e9f75cd35a8ec4b0f8a3945f078`.
- 실제 Android 기기 터치 확인은 아직 필요.

## v7.11.16 (2026-09-12) — Vault 하단 버튼 크기 맞춤
- Vault 하단의 일반 노트·V노트·V폴더 버튼을 첫 화면 Notes/Folder와 같은 글자 크기·패딩·line-height·높이로 맞춤(18.36px, 3.3048px 10.098px, 22.95px, 29.53px). 폴더 아이콘 버튼도 같은 규격.
- 후속 320px 영어 테스트에서 버튼 줄의 12px overflow를 발견했고, v7.11.17에서 버튼 크기를 바꾸지 않고 간격·바 여백만 조정해 해결.

## v7.11.15 (2026-09-12) — 폴더/Vault 하단 버튼 정렬·타원형
- 폴더 허브 하단 바: 노트 버튼을 왼쪽 끝, Vault 버튼을 오른쪽 끝에 배치.
- Vault 화면 하단의 ‘← 일반 노트’·‘V노트’·‘V폴더’ 버튼을 낮고 가로로 긴 타원형으로 통일. 320px 실측에서 텍스트가 잘리지 않고 세 버튼 종횡비가 모두 2.08 이상.
- 검증: `review/v71115.js` 33/33 PASS(하단 위치·타원형·320px 포함), 회귀 v7104 14/14·v7105 10/10·v7106 9/9, 업데이트 흐름 11/11, SW 단위 6/6 PASS. JS 오류 0; CSS 파싱 오류/경고 0. APP_VER/SW 7.11.15. CSP sha256-pBA/MdXUkwsoRc3/8p/jYOm05jT0GQ8sXpedUb/wlnM=.
- 패키지 `/home/user/download/soonnote-v7.11.15.zip` 생성. ZIP 무결성·SHA-256·앱/SW 버전·CSP 확인 완료. 실제 기기 터치 확인은 아직 필요.

## v7.11.14 (2026-09-12) — 설정 아래 업데이트 확인 버튼 상시 표시
- 요청 반영: 설정 맨 아래 업데이트 카드/버튼을 새 서비스워커 감지 여부와 관계없이 항상 표시. 기본 버튼은 ‘업데이트 확인’. 누르면 `registration.update()`로 직접 확인하고, 최신이면 ‘현재 최신 버전입니다’, 연결 실패면 재시도 안내를 표시. 새 작업자가 준비되면 ‘새 업데이트 버전이 준비되어 있습니다’ 상태와 업그레이드 확인 팝업(업그레이드/나중에)을 띄움. 업데이트가 이미 감지된 경우에도 확인 팝업 후 적용.
- 버튼·안내·최신/실패 문구 en/ko/ja/zh/es 번역. 서비스워커 대기/활성화 및 편집 중 업데이트 보류 안전 흐름 유지. 버전 APP_VER/SW 7.11.14.
- 검증: `review/v71114.js` 31/31, 회귀 v7104 14/14·v7105 10/10·v7106 9/9, 수동 업데이트 검사·준비/팝업·작업 보류 통합 11/11, SW 단위 6/6 PASS. 320/390px 반응형·5개 언어 수동 최신 검사 5/5, JS 오류 0, CSS 파싱 오류/경고 0. CSP 해시: sha256-WcNvEbY5TL1Mr80oq4AhZQ7tNUdiFF4En19jG54brQw=.
- 변경 파일: index.html, sw.js, _headers, DEPLOYMENT_HEADERS.txt. 패키지 `/home/user/download/soonnote-v7.11.14.zip` 생성. ZIP 무결성, 내부 SHA-256, 앱/SW 버전, CSP 확인 완료.

## v7.11.13 (2026-09-12) — 설정 업데이트 안내·전환 모션 정리
- 설정 맨 아래(버전 표시 바로 아래)에 새 버전 상태 문구와 Upgrade 버튼 추가. 새 서비스워커가 대기 중일 때만 안내 표시. en/ko/ja/zh/es 번역, `aria-live="polite"` 적용.
- 업데이트 안정성: 서비스워커 설치 시 자동 활성화(skipWaiting) 제거; 사용자 확인 메시지에서만 활성화. 편집 등 진행 중인 작업이 있으면 끝날 때까지 업데이트를 미루고, 작업 종료 후 활성화/새로고침. 최초 설치의 첫 controllerchange는 업데이트로 오인하지 않도록 가드. 새 작업자 활성화는 `waitUntil(skipWaiting())`로 수명주기에 연결.
- 모션: 120ms/180ms/240ms 공통 토큰과 공통 easing으로 주요 버튼·팝업·시트 전환을 정리하고, reduced-motion에서는 주요 전환을 사실상 즉시 처리. 브라우저 실측: 일반 모드 오버레이 180ms, 설정 시트 240/180ms; reduced-motion 0.00001s.
- 정리 검토: 데이터 크기 섹션의 불필요한 중첩 `.setsec` 래퍼 1개 제거. HTML id 226개 중 중복 없음. 기존 dead-code 후보 문자열은 실제 코드가 아니라 과거 정리 내역을 적은 주석에만 남아 있어 추가 삭제하지 않음. 백업/미리보기 파일은 버전 기록과 회귀 참고용이므로 삭제하지 않고 배포 ZIP에서 제외.
- 검증: `review/v71113.js` 31/31, 회귀 v7104 14/14·v7105 10/10·v7106 9/9, 업데이트 흐름 8/8, SW 단위 6/6 PASS; JS 오류 0. 업데이트 안내 반응형 확인 320/390px × 5개 언어 = 10/10. CSS 파싱 오류/경고 0, CSP 해시가 index/meta/_headers/배포 안내와 일치.
- 감사 결과: 앱은 정적 HTML/SW이며 자체 npm 런타임 의존성은 없음. 테스트용 `review` Playwright 1.47.2의 GHSA-7mvr-c777-76hp 고위험 항목을 1.65.1로 올림; `npm audit` 0 vulnerabilities. 설치된 대응 Chromium으로 브라우저 테스트를 다시 실행해 모두 통과.
- 패키지: `/home/user/download/soonnote-v7.11.13.zip` 생성. ZIP 무결성, 내부 SHA-256, 앱/SW 버전 일치(7.11.13), 패키지 CSP 확인 완료. 실제 Android/iOS 기기 터치 테스트는 아직 필요.
