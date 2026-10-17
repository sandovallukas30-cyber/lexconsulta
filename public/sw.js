/* Service worker mínimo de Prima Lex: la app abre sin conexión.
 *  - Páginas (navegación): primero la red; sin red, la última copia guardada.
 *  - /assets/* (nombres con hash, no cambian): primero la copia guardada.
 *  - Nunca toca /api/ ni la verificación de correo.
 *  Para forzar una actualización de todo, sube el número de VERSION. */
const VERSION = 'v1'
const CACHE = `prima-lex-${VERSION}`

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/favicon.svg', '/manifest.webmanifest'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('prima-lex-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const guardar = (req, res) => {
  if (res && res.ok && res.type === 'basic') {
    const copia = res.clone()
    caches.open(CACHE).then((c) => c.put(req, copia))
  }
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/verify')) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => guardar(new Request('/'), res))
        .catch(() => caches.match('/').then((r) => r ?? Response.error()))
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((r) => r ?? fetch(req).then((res) => guardar(req, res))))
    return
  }

  e.respondWith(fetch(req).then((res) => guardar(req, res)).catch(() => caches.match(req).then((r) => r ?? Response.error())))
})
