// Minimal service worker: cache-first for static shell, network-first for API.
// Bump CACHE_VERSION to invalidate the shell on deploy.

const CACHE_VERSION = 'rh-shell-v4';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './utils.js',
  './api.js',
  './app.js',
  './screens/login.js',
  './screens/mobile.js',
  './screens/desktop.js',
  './screens/team.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Bring tab to focus (or open one) when user taps a native notification.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsArr) {
      if (c.url.includes(self.registration.scope) && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(self.registration.scope);
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache API calls.
  if (url.pathname.includes('/webhook/') || url.hostname.includes('ngrok')) return;
  // Same-origin, GET: cache-first.
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      if (res.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(e.request, res.clone());
      }
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
