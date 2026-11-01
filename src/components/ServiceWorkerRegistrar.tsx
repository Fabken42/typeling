'use client'

import { useEffect } from 'react'

// Registers the service worker (public/sw.js) once the page has loaded. The SW
// caches the immutable build assets so returning to a backgrounded tab repaints
// from cache instead of re-downloading everything, and serves an offline
// fallback when the network is gone.
//
// Only runs in production: in dev the SW would cache Next's HMR chunks and fight
// fast-refresh.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is best-effort — the app works without it */
      })
    }

    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
