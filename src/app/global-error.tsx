'use client'

import { useEffect } from 'react'

// Last-resort boundary that replaces the root layout when it (or something it
// renders) throws. It must provide its own <html>/<body>, and can't rely on the
// app's CSS being present, so the styles are inlined. Mirrors the dark theme.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#09090b',
          color: '#f4f4f5',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '24rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Algo deu errado
          </h1>
          <p style={{ marginTop: '0.5rem', color: '#a1a1aa', fontSize: '0.875rem' }}>
            Ocorreu um erro inesperado. Recarregue a página.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '1.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#059669',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  )
}
