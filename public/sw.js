/* Typeling service worker.
 *
 * Goals:
 *  - Make returning to a backgrounded/discarded tab fast: serve the immutable
 *    build assets (/_next/static/*) and icons from cache instead of the network.
 *  - Stay correct: never cache the API (always fresh data) and always try the
 *    network first for page navigations, so an online user never sees a stale
 *    page — the cache is only a fallback when offline.
 *
 * Bump CACHE_VERSION to force old caches out on the next activate.
 */
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `typeling-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `typeling-runtime-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE = [OFFLINE_URL, '/icon.svg', '/icon-maskable.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only handle same-origin requests; let cross-origin (Google avatars, fonts)
  // go straight to the network / browser HTTP cache.
  if (url.origin !== self.location.origin) return

  // API responses must always be live — never served from cache.
  if (url.pathname.startsWith('/api/')) return

  // React Server Component payloads (Next fetches these on client-side
  // navigation). They carry per-request dynamic data, so bypass the SW and go
  // straight to the network — caching them could surface stale content.
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return

  // Immutable, content-hashed build output + our static icons: cache-first.
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    PRECACHE.includes(url.pathname)
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Page navigations (HTML): network-first, fall back to the last cached copy,
  // then to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else same-origin (images, etc.): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  try {
    const response = await fetch(request)
    // Only cache real page responses — skip redirects (e.g. an auth bounce to
    // /login) so we never serve the wrong page for this URL when offline.
    if (response.ok && !response.redirected) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    return offline ?? Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}
