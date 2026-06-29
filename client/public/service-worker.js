// Minimal service worker — required for PWA installability
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 408 })))
})
