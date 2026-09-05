/* soonenote — Service Worker (오프라인 지원)
   v6.1 수정: HTML은 네트워크 우선(network-first) → 새 버전 배포 시 즉시 반영.
   나머지 정적 파일만 캐시 우선(cache-first). */
const VERSION = '6.1';
const CACHE = 'soonenote-v' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './vendor/supabase.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // 하나가 404여도 나머지는 캐시되도록 개별 처리
      Promise.all(ASSETS.map(u => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  let url;
  try { url = new URL(e.request.url); } catch (_) { return; }
  if (url.origin !== location.origin) return;   // 외부(동기화) 요청은 건드리지 않음

  const isDoc = e.request.mode === 'navigate' ||
                url.pathname === '/' ||
                url.pathname.endsWith('.html');

  if (isDoc) {
    // ── HTML: 항상 네트워크 먼저. 실패할 때만 캐시 ──
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match('./index.html').then(hit => hit || caches.match('./'))
        )
    );
    return;
  }

  // ── 그 외 정적 파일: 캐시 먼저, 없으면 네트워크(받으면 캐시) ──
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});
