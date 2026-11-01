import type { MetadataRoute } from 'next'

// Web App Manifest (served at /manifest.webmanifest). Makes Typeling installable
// as a standalone PWA — installed PWAs are far less likely to be discarded by
// the OS when backgrounded, so returning to the app reloads much less often.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Typeling',
    short_name: 'Typeling',
    description: 'Estude idiomas digitando legendas, letras e textos.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#09090b',
    lang: 'pt-BR',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
