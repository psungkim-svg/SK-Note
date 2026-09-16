# soonenote v7.5 — Vault, backup, lifecycle 보안 메모

## Vault 암호화 형식은 유지

- `sk.vault`에는 Vault `notes`, `folders`, `settings`가 AES-256-GCM **v2 envelope 하나**로 암호화되어 저장됩니다.
- 새/변경 Vault password는 12자 이상이어야 합니다.
- password verifier/key는 random 16-byte salt 및 PBKDF2-HMAC-SHA-256 210,000회로 파생합니다.
- Vault Folder와 Vault settings도 같은 encrypted payload 안에 있으므로 일반 localStorage 키로 분리해 평문 저장하지 않습니다.

## v7.5 timed warm session의 정확한 경계

사용자가 Vault 화면에서 normal Notes 화면으로 이동한 경우에는 편의상 설정된 1/5/15/30분 timeout이 만료될 때까지 복호화 key와 데이터가 RAM에 남습니다. 따라서 같은 살아 있는 앱 페이지에서 Vault를 다시 열면 password를 다시 입력할 필요가 없습니다.

이는 **무기한 unlock**이 아닙니다.

- 실제 timer callback은 Vault 화면이 보이는지와 관계없이 실행됩니다.
- 만료 callback은 `VLT.leave()`를 실행해 key, decrypted notes/folders/settings, Vault Folder/editor DOM 및 timer를 정리합니다.
- key가 있지 않으면 `VLT.open()`은 일반 password gate로 갑니다.
- Vault 활동은 timer를 다시 시작하지만 normal Notes로 나가는 행위는 별도의 무제한 연장이 아닙니다.
- (v7.5.2) `pagehide`(앱 백그라운딩/탭 전환)에서는 더 이상 key를 지우지 않습니다. PWA 홈 화면 전환 같은 일시 중지는 "닫힘"에 해당하지 않으며, **자동 잠금 timeout(1/5/15/30분)이 유일한 잠금 경계**입니다. key는 프로세스가 실제로 종료될 때만 소멸합니다.
- (v7.5.2) bfcache 복귀(`pageshow persisted`)와 foreground 복귀(`visibilitychange`) 시점에 `Date.now() > deadline`이면 timer callback을 기다리지 않고 즉시 `VLT.leave()`합니다. 백그라운드에서 JS 타이머가 동결돼도 실제 만료만 정확히 잡힙니다.
- (v7.5.2) Vault 재진입(`VLT.open()`) 전에도 deadline을 재점검합니다. 타이머가 한 번도 다시 실행되지 않은 동결 세션(예: 화면 오프 중 1분 설정)은 재진입 즉시 잠금 후 password gate로 갑니다.
- (v7.5.3) **워밍 세션 영속화**: 페이지 새로고침/앱 재시작으로 메모리 key가 사라져도, deadline까지 `sk.vault.session`에 {key raw bits, deadline}을 보관해 시작 시 복원합니다. 복원은 **암호문 전체의 AES-GCM 복호화 성공 후에만** 수행되며, 실패(변조·오류) 시 세션은 삭제되고 password gate로 갑니다. 만료 세션은 시작 시 삭제, `VLT.leave()`/비밀번호 변경/`wipe()` 시 즉시 삭제됩니다.
- (v7.5.3) **트레이드오프(명시)**: v7.5.2까지는 새로고침 시 key가 소멸해(더 엄격하지만) 실제 기기에서 "매번 비밀번호" 문제가 있었습니다. 사용자 요구("자동 잠금 timeout이 유일한 잠금 경계")를 실제 기기 사이클까지 충족시키기 위해, **timeout(1/5/15/30분) 전까지 localStorage에서 AES key 자료를 읽을 수 있는 공격자에게 노출될 수 있는 위험**을 받아들입니다. 대가: 공유 기기는 1분 설정, 민감 환경은 PWA를 완전히 닫아 주세요. password 자체는 어디에도 저장되지 않으며(여전히 PBKDF2 해시로만), 세션 키는 GCM으로 검증됩니다. password change·wipe·잠금 시 세션은 즉시 폐기됩니다.
- (v7.5.3) 세션 파일 구조: `sk.vault.session = {v:1, k: base64(32B PBKDF2-SHA256 raw bits), t: deadlineEpochMs}`. `k`는 운영 CryptoKey(AES-GCM 256, non-extractable)와 동일한 key material이며, 복원 시 `importKey('raw')`로 같은 키를 재구성합니다.
- 화면을 다시 foreground로 가져오는 경우에도 transient UI를 복원하지 않고 normal main Notes 화면으로 보냅니다. 살아 있는 페이지의 warm session은 timeout 전까지만 남습니다.

따라서 공유 기기에서는 Vault에서 normal Notes로 나간 뒤, 혹은 앱을 백그라운드에 돌린 뒤에도 **timeout이 지날 때까지**는 다른 사람이 같은 실행 중인 Vault를 열 수 있다는 점을 고려해야 합니다. 즉시 잠그려면 timeout을 1분으로 설정하거나 browser/PWA를 실제로 닫아 주세요(프로세스 종료).

## backup의 평문 보호

`buildBackup()`과 Backup 버튼이 만드는 v5 JSON은 다음만 담습니다.

- normal Notes와 Folder metadata
- detached encrypted Vault envelope (`iv`, ciphertext, authenticated encrypted payload 및 password verifier metadata)

Vault title, body, checklist, folder name, Vault settings의 평문은 backup/export JSON에 넣지 않습니다. backup 목록의 Vault UI도 Vault note preview를 렌더링하지 않습니다. legacy backup 안에 `vaultNotes`/`vaultFolders` 평문 배열이 발견되면 앱 내 local backups에서 제거합니다.

**중요:** ciphertext-only backup도 Vault password를 잊었을 때 복호화할 수 없습니다. backup 파일과 password를 분리 보관하세요.

## Restore 순서와 안전성

- normal backup restore는 merge 방식입니다. 없는 note는 추가하고 backup 쪽 `updatedAt`이 더 새면 갱신합니다.
- Vault snapshot restore는 현재 Vault ciphertext를 교체하기 전에 명시적 confirmation을 요구합니다.
- 복구된 snapshot은 즉시 key 없이 저장됩니다. backup의 Vault password를 입력해 성공적으로 복호화해야 내용을 볼 수 있습니다.
- normal note → Vault transfer는 destination encrypt/persist를 먼저 성공시킨 다음 normal source를 지웁니다. 실패 때에는 source 보존(중복 우선)을 택합니다.

## Notification 개인정보

- pin 알림과 ⏰ reminder 알림은 browser/OS가 허용한 local Notification의 best-effort 기능이며 server Push나 외부 note 전송이 아닙니다.
- normal note pin은 사용자가 선택한 제목과 최대 100자 요약을, normal note reminder는 제목과 본문 90자를 표시할 수 있습니다.
- **Vault pin과 Vault reminder는 모두** 항상 `🔐 Vault`(알림) 및 내용 없는 일반 안내만 사용합니다. Vault title/content/checklist/folder name을 어떤 local notification payload에도 넣지 않습니다.
  - (v7.5.1) reminder 경로에 같은 가드를 적용했습니다. 이전 v7.5에서는 Vault 노트의 reminder가 제목·본문을 노출할 수 있었습니다.
- 이 static PWA는 앱 종료 후 계속 남는 native ongoing notification 또는 server Push delivery를 보장하지 않습니다.
