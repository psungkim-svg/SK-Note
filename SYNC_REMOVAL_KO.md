# 동기화(Supabase) 비활성/제거 절차 (v7.6.1 구조)

현재 기본 버전은 동기화 **사용**(`FEATURES.sync=true`). 프리미엄/기본 분리 시 아래 한 줄로 안전하게 끕니다.

## 1단계 — 스위치만 끄기 (권장, 코드 보존)
`index.html`: `const FEATURES={sync:true};` → `{sync:false}`

이 한 줄로 다음이 **모두** 비활성화됩니다(테스트 verify761 S5로 검증):
- `SYNC.restore/pushDirty/pullAll/hardDelete/deleteFolder` → 즉시 return (네트워크 0)
- `syncSoon()/syncNow()` → no-op (타이머·online/focus/60초 주기 훅 포함)
- `SYNC.libOk()/ready()` → false (클라이언트 생성 안 함)
- 설정 화면의 "Sync" 섹션(`#secSync`) 제거, `openAccount()` → 안내 토스트
- 저장/백업/Vault/사진 링크 등 나머지 기능은 영향 없음(모든 호출부가 `if(!ui.vault)syncSoon()` 같은 fire-and-forget이라 no-op이어도 흐름이 끊기지 않음)

## 2단계 — 파일까지 빼기 (선택)
- `vendor/supabase.min.js` 삭제 + `<script src="vendor/supabase.min.js">` 제거 → `libOk()`가 false라 오류 없음.
- CSP `connect-src`에서 `https://*.supabase.co wss://*.supabase.co` 제거 가능.
- Play Data Safety: "데이터 전송 없음"으로 단순화.

## 주의
- 설정에 남아 있을 수 있는 `sbUrl/sbKey`는 그대로 두어도 사용되지 않음(원하면 로드 시 삭제 코드 1줄 추가).
- 프리미엄 복귀 시 `{sync:true}`로 되돌리면 그대로 동작.
