/* Service worker - app shell cache. Bump CACHE when you upload a new index.html. */
const CACHE = 'ropafix-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('ropafix-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  /* never touch live data: Google Apps Script, Firebase / Firestore, auth */
  if (/script\.google(usercontent)?\.com|googleapis\.com|firebaseio\.com|firestore|identitytoolkit|securetoken/.test(url.hostname + url.pathname)) return;
  if (url.origin === location.origin) {
    /* network first so updates arrive, cache fallback when offline */
    e.respondWith(fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => caches.match(req).then(m => m || caches.match('index.html'))));
    return;
  }
  /* libraries from CDNs (xlsx, firebase sdk): cache first */
  if (/cdnjs\.cloudflare\.com|gstatic\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })));
  }
});
