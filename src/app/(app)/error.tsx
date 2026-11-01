'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Error boundary for the authenticated app pages. A failed query (e.g. the DB
// is briefly unreachable) now renders this instead of a raw crash, and `reset()`
// re-renders the segment to retry.
export default function AppError({
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
    <div className="grid place-items-center py-24 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-600/15 text-rose-400">
          <AlertTriangle size={28} />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted">
          Não foi possível carregar esta página. Tente novamente.
        </p>
        <Button variant="primary" className="mt-6" onClick={reset}>
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
