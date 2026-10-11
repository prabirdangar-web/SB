/* TFHS Service Book service worker (scope: /SB/ only).
   Caches the app shell and the 3 Firebase libraries. Firebase data/auth calls are never touched. */
const CACHE = "tfhs-sb-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const LIBS = [
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"
];
const shellUrls = SHELL.map(p => new URL(p, self.location).href);

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    await Promise.all(LIBS.map(u => fetch(new Request(u, {mode: "no-cors"})).then(r => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (LIBS.includes(req.url)) { // versioned libraries: cache first
    e.respondWith(caches.match(req.url).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req.url, cp)); return res; })));
    return;
  }
  if (!shellUrls.includes(req.url)) return; // everything else passes through
  e.respondWith( // app shell: network first so updates arrive, cache as offline fallback
    fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
