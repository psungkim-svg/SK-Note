# soonenote v7.5.1 — 보안·강건성 패치 변경 내역 (FIXES)

**작성일:** 2026-09-12
**기준:** v7.5 릴리스(`uploads/` 원본) → `fix_v7.5.1/` 작업본
**범위:** `index.html` (7곳) · `sw.js` (2곳) · 문서 3종 · 아이콘 3종(생성 대체) · 버전 7.5 → **7.5.1**
**검증:** 수정된 파일에서 실제 함수를 추출해 실행하는 해르네스 15개 체크 전부 통과 + `node --check` + CSP 해시 재계산 일치 + `sha256sum -c` 전체 통과

---

## A. 보안 (P0)

### 1. Vault 노트 알림 평문 노출 차단 — `index.html` `fireReminder()`

**문제:** 케밥 메뉴의 ⏰ 알림을 Vault 노트에도 설정할 수 있었고, 알림 도래 시 `fireReminder()`가 Vault 가드 없이 제목 + 본문 90자를 `new Notification()`에 넣어 **시스템(잠금)알림에 평문이 노출**되었다. `SECURITY_NOTES_KO.md`의 Vault notification policy("Vault 알림은 내용 없는 일반 안내만")와 모순되는 경로는 pin이 아니라 reminder였다(pin은 이미 가드됨).

**수정:**
```js
function fireReminder(id){
  /* (v7.5.1 보안보완) Vault 노트 알림은 제목·본문을 절대 포함하지 않는다 — 일반 안내만. */
  const inVault=VLT.notes.some(x=>x.id===id);
  const n=(inVault?VLT.notes:S.notes).find(x=>x.id===id);if(!n||n.deleted)return;
  const title=inVault?L('🔐 Vault 알림','🔐 Vault reminder'):'⏰ '+(n.title||APP_NAME);
  const body=inVault?L('보관함 노트의 알림 시간입니다. 내용은 표시하지 않습니다.',
                       'A vault note reminder is due. Content is not shown.')
                    :(n.type==='check'?...:plain(n.content).slice(0,90));
  // ...나머지 동일
}
```

**검증:** 실제 함수 추출 테스트 — (1) 일반 노트 알림은 제목+본문 그대로 유지, (2) Vault 노트 알림 payload에 `TOP SECRET`/`password123` 등 평문 0바이트, (3) 삭제된 노트는 알림 없음.

---

## B. 강건성 (P1)

### 2. Vault 자동잠금 deadline 재확인 — `visibilitychange` / `pageshow`

**문제:** auto-lock이 `setTimeout`이라 화면 오프·백그라운드(JS 동결)로 타이머가 실제 만료보다 늦게 fire될 수 있었고, foreground 복귀 핸들러는 deadline(`VLT._autoUntil`)을 점검하지 않았다.

**수정:** foreground 복귀·bfcache 복원 시 `Date.now()>VLT._autoUntil`이면 `VLT.leave()`를 즉시 실행:
```js
else if(document.readyState==='complete'){
  /* (v7.5.1) 백그라운드 동결로 auto-lock timer가 실제 만료를 넘겨 쌓인 경우,
     foreground 복귀 즉시 deadline을 점검해 잠금. */
  try{if(VLT&&VLT.key&&VLT._autoUntil&&Date.now()>VLT._autoUntil)VLT.leave();}catch(_){}
  resetToFirstNotesScreen(false);
}
```
(`pageshow`(persisted) 경로에도 동일 체크 추가.)

### 3. `suppressPop` boolean → `suppressPops` 카운터

**문제:** 300ms 안에 오버레이 2개를 연속 닫으면(빠른 Back 2연타) 두 번째 `history.back()`이 boolean 플래그 때문에 건너뛰어져, "아무것도 닫지 않는 죽은 Back" 한 번이 발생했다.

**수정:** 호출마다 `history.back()` 1회 + `suppressPops++`, popstate마다 1회씩 소모, 300ms 타임아웃은 안전망 그대로.
**검증:** `histPop();histPop()` → `history.back()` 정확히 2회, popstate 2회 소모 후 카운터 0.

### 4. 기기 내 백업 저장 실패 보고 — `saveLocalBackup()` + Export 토스트

**문제:** `saveLocalBackup()`의 catch가 전부 삼켜져 저장 공간 부족으로 **기기 내 백업 사본**이 안 들어가도 토스트는 "백업 저장"이었다. (외부 파일 다운로드는 정상 동작.)

**수정:** `saveLocalBackup()`이 성공/실패를 반환하고, `#stExport`·`#stExportEn`(picker/다운로드 2경로 모두)에서 실패 시 "파일은 받았지만 기기 내 목록에 보관하지 못했습니다"로 구분 표시.
**검증:** 5MB 쿼터 대비 6MB 백업 → `false` 반환 + 목록 비어있음. 정상 크기 → `true` + 목록 1개.

### 5. Service Worker 루트 문서 캐시 갱신 — `sw.js`

**문제:** navigate 성공 시 `./index.html`만 갱신하고 `./` 엔트리는 install 시점에 고정 → 오프라인 폴백이 구버전 루트 문서일 수 있었음.

**수정:**
```js
caches.open(CACHE).then(c => { c.put('./index.html', copy); return c.put('./', copy); }).catch(() => {});
```

---

## C. 기타 정리 (P2)

| # | 변경 | 파일 |
|---|---|---|
| 6 | I18N(영문 사전)의 중복 `delete` 키 제거 (동작 무해, 린트 위생) | index.html |
| 7 | "모두 복구" 토스트에 "🔐 Vault는 별도 확인 버튼으로 복구됩니다" 안내 추가 (스냅샷 포함 백업, 전체 복구 시) | index.html |
| 8 | 헤더 주석 `V7.3` → `V7.5.1` + v7.5.1 변경 블록 추가 | index.html |
| 9 | `APP_VER` 7.5 → **7.5.1**, sw `VERSION` 7.5 → **7.5.1** (캐시명 `soonenote-v7.5.1`으로 자동 전환) | index.html, sw.js |
| 10 | CSP 인라인 스크립트 해시 재계산: `sha256-Ii0S32eF…` → `sha256-BKMCAD1eL1PRF05s/3YMeAt1jmLOOFZradY9a7dNtxc=` (meta + DEPLOYMENT_HEADERS 동시 반영) | index.html, DEPLOYMENT_HEADERS.txt |
| 11 | `icons/` 3종(192/512/maskable-512) 생성 — v7.5 원본 PNG가 이 작업에 제공되지 않아 앱 팔레트(웜 오프화이트 배경 + 더스티 로즈 헤더 + 세이지 연필)에 맞춘 플랫 디자인으로 대체. manifest·apple-touch-icon·mask-icon 참조 경로 그대로 | icons/ (신규) |

## D. 검토 후 **의도적으로 미반영**한 항목 (이유)

| 항목 | 판단 |
|---|---|
| pull 병합 동점 `>=`→`>` | 실제 효과는 동일 millisecond 경합(거의 불가)뿐이며, 실시간 채널 핸들러와 일관성·회귀 리스크가 있어 유지. 추후 서버 측 last-write-wins 정책과 함께 결정 권장 |
| `history.pushState` 누적 정리 | push 전 `history.go(-N)` 삽입은 popstate 재처리와 상호작용이 있어 회귀 테스트(Playwright Back 시퀀스) 없이 적용 위험 |
| PBKDF2 210k → 600k | OWASP 2023 권장치 상향은 유효하나 클라이언트 해싱 지연(~0.5~1초) 트레이드오프가 있어 별도 릴리스에서 결정 권장 |
| `vendor/supabase.min.js` | **변경 없음.** 공식 supabase-js@2.45.4 UMD 빌드와 byte-for-byte 일치 + SHA-256/SRI 검증 통과 (jsDelivr 동적 배너 제외) |

---

## E. 배포 시 주의

1. `manifest.webmanifest.txt` → **`manifest.webmanifest`** 로 이름 변경 후 업로드 (이 폴더에서는 이미 rename 완료).
2. `icons/` 3개 파일: v7.5 원본이 제공되지 않아 **동일 팔레트의 생성 아이콘으로 대체**해 번들에 포함했습니다 (SHA256SUMS 참조). 원본 v7.5 아이콘이 있다면 그것으로 `icons/`를 덮어쓰고 `sha256sum`으로 SHA256SUMS를 갱신하세요 — 두 방식 모두 바로 배포 가능합니다.
3. `DEPLOYMENT_HEADERS.txt`의 **새 CSP 해시**가 적용된 헤더를 서버에 반영 (인라인 스크립트가 바뀌었으므로 구 헤더와 섞이면 스크립트 실행 차단).
4. 검증: `sha256sum -c SHA256SUMS.txt` (폴더 전체) → Settings에서 `v7.5.1` 확인 → README "배포 뒤 빠른 확인" 6단계 실행.
5. v7.5의 VALIDATION_KO.md Playwright 스위트(특히 Back 시퀀스·Vault 타이머)를 v7.5.1 작업본에 대해 **재실행** 권장 — 3번(suppressPops)과 2번(deadline 체크)이 해당 영역을 건드렸으므로.
