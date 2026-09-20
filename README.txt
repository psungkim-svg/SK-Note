soonenote v7.8.9 — 배포에 필요한 파일만 담았습니다.

index.html            앱 본체 (전부 이 한 파일에 들어 있음)
sw.js                 서비스 워커 (오프라인·빠른 시작)
manifest.webmanifest  PWA 설치 정보 (이름·아이콘·색)
icons/                앱 아이콘 3개
vendor/supabase.min.js  동기화용 라이브러리 (동기화 안 쓰면 없어도 됨)
DEPLOYMENT_HEADERS.txt  호스팅에 넣을 보안 헤더(CSP) 값 — 배포 시 참고
SHA256SUMS.txt        파일 무결성 확인용 (선택)

이 폴더를 그대로 웹 호스팅(또는 Capacitor www/)에 올리면 됩니다.
