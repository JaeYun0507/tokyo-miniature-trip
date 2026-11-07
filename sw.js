// 오프라인에서도 열리도록 앱 파일과 지도 데이터를 저장해 둬요. 새 버전을 올릴 때는 VERSION을 바꿔요.
const VERSION = 'tokyo-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'days.js', 'food.js', 'picks.js', 'manifest.webmanifest',
  'vendor/three.module.min.js', 'vendor/OrbitControls.js', 'vendor/BufferGeometryUtils.js',
  'osm.json', 'osm2.json', 'osm3.json', 'osm4.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map((u) => c.add(u).catch(() => { /* 한 파일이 없어도 설치는 계속 */ })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const heavy = /\/(vendor|icons)\/|osm\d*\.json$/.test(url.pathname);
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (heavy && hit) return hit; // 거의 안 바뀌는 큰 파일은 저장본 우선
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return hit || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }
  })());
});
