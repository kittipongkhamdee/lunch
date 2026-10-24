// Service worker: เก็บไฟล์ของแอพไว้ในเครื่อง ใช้งานออฟไลน์ได้ (network-first เพื่อให้ได้เวอร์ชันล่าสุดเสมอเมื่อมีเน็ต)
const CACHE = 'lunch-v1';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/main.js', 'js/store.js', 'js/docs.js', 'js/util.js',
  'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/garuda.png',
  'assets/fonts/Sarabun-Regular.ttf', 'assets/fonts/Sarabun-Bold.ttf', 'data/seed.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
