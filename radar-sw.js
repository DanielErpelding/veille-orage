/* Service worker for the PPI radar PWA.
   App shell is cached for offline UI; live data (RainViewer tiles,
   Blitzortung WebSocket) always goes to the network. */
'use strict';

const CACHE = 'jlp-radar-ppi-v34';
const SHELL = [
  './',
  'index.html',
  'radar.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Never intercept live-data hosts — let them hit the network directly.
  if (url.hostname.indexOf('rainviewer.com') !== -1 ||
      url.hostname.indexOf('blitzortung.org') !== -1) {
    return;
  }

  // App shell (same-origin): cache-first, refresh in background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
