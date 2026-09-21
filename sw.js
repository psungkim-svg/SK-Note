/* soonenote — Service Worker (오프라인 지원)
   v6.1 수정: HTML은 네트워크 우선(network-first) → 새 버전 배포 시 즉시 반영.
   나머지 정적 파일만 캐시 우선(cache-first).
   v7.5: reliable Back stack, timed Vault re-entry, and cache version raised to retire prior assets. */
const VERSION = "7.9.3";
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
      /* (v7.8.4) 설치 때는 브라우저 HTTP 캐시를 건너뛰고(cache:'reload') 서버에서 새 파일을 받는다 — 호스팅이 Cache-Control 을 길게 주면 옛 index.html 이 새 캐시에 들어가던 문제 방지 */
      Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
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

/* (v7.5.8 요청4) 앱이 '고정 해제'로 알림을 닫기 직전에 태그를 알려 준다 → 그 닫힘은 재게시하지 않는다. */
const UNPIN = new Set();
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (e.data && e.data.type === 'SK_UNPIN' && e.data.tag) {
    UNPIN.add(e.data.tag);
    setTimeout(() => UNPIN.delete(e.data.tag), 15000);
  }
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
    /* ── (v7.8.2) HTML: 캐시 먼저 즉시 응답 + 뒤에서 네트워크로 갱신(stale-while-revalidate) ──
       이전(네트워크 우선)에는 앱을 켤 때마다 네트워크 응답을 기다린 뒤에야 첫 화면을 그려
       Android PWA 스플래시(큰 아이콘)가 1초 이상 떠 있었다. 이제 첫 화면은 캐시에서 즉시 뜨고,
       새 버전은 다음 실행(또는 앱이 백그라운드로 갈 때 swApplyUpdate)에 반영된다. */
    e.respondWith(
      caches.match('./index.html').then(hit => {
        const net = fetch(e.request, { cache: 'no-cache' }).then(res => {   /* (v7.8.4) 서버에 항상 재확인 */
          if (res && res.ok) {
            const c1 = res.clone(), c2 = res.clone();
            caches.open(CACHE).then(c => Promise.all([c.put('./index.html', c1), c.put('./', c2)])).catch(() => {});
          }
          return res;
        }).catch(() => hit || caches.match('./'));
        if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
        return net;
      })
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


/* Local pinned-note notifications are best-effort; no server Push or note plaintext is stored here. */
/* (v7.5.8 요청4) 고정 알림(sk-pinned-*)은 스와이프/OS 정리로 사라져도 조용히 다시 띄운다.
   '고정 해제'(SK_UNPIN 통보 후 닫힘)일 때만 그대로 사라진다. 노트 평문은 알림 data 안의 제목/요약뿐이며 저장하지 않는다. */
self.addEventListener('notificationclose', event => {
  const n = event.notification;
  const tag = n && n.tag;
  if (!tag || !String(tag).startsWith('sk-pinned-')) return;
  if (UNPIN.has(tag)) { UNPIN.delete(tag); return; }
  const d = n.data || {};
  if (!d.pinned) return;
  event.waitUntil(new Promise(r => setTimeout(r, 400)).then(() =>
    self.registration.showNotification(d.title || n.title || '📌', {
      body: d.body || n.body || '', icon: n.icon || './icons/icon-192.png',
      tag, requireInteraction: true, silent: true, data: d
    }).catch(() => {})
  ));
});
self.addEventListener('notificationclick', event => {
  const pinned = event.notification && String(event.notification.tag||'').startsWith('sk-pinned-');
  if (!pinned) event.notification.close();   /* 고정 알림은 탭해도 닫지 않는다(고정 해제 전까지 유지) */
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    const open=list.find(c => 'focus' in c);
    return open ? open.focus() : clients.openWindow('./');
  }));
});
