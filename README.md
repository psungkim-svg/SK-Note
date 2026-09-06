# SK Notes — Web App (Vercel용)

개인 메모/노트 앱(한국어·영어 자동/수동 전환, 컬러 노트, 폴더, 보관 노트, Supabase 동기화).
이 폴더는 **웹 배포용 정적 파일**입니다. GitHub 저장소 → Vercel 자동 배포로 사용하세요.

## 파일 구성
```
index.html              앱 전체(HTML+CSS+JS 인라인, v6.0)
sw.js                   오프라인 서비스워커 (캐시 v32)
manifest.webmanifest    PWA 설치 매니페스트
icons/                  앱 아이콘
```

## 이 저장소를 Vercel에 배포
1. 이 폴더 내용을 새 GitHub 저장소(`예: sknote-web`)에 push.
2. Vercel에서 **New Project → 이 저장소 연결** (프레임워크: **Other**, 빌드 없음).
3. 배포된 주소로 열면 됩니다. (이 앱은 순수 정적 파일이라 빌드 설정이 필요 없음)

> ⚠️ 데이터는 사용자의 브라우저/기기에 저장됩니다. 별도 빌드/서버 명령이 필요 없습니다.

## 변경 후 반영
- `index.html`을 수정했다면 GitHub에 push하면 Vercel이 자동 재배포됩니다.
- 서비스워커 캐시가 예전 화면을 보여줄 수 있으니, **버전 배지와 sw.js 캐시 이름을 함께 올려** 두세요.

---
SK Notes v6.0 (2026-09-03)
