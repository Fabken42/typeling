'use client'

import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Shown by the service worker when a navigation fails and no cached copy exists
// (i.e. the user is offline and hasn't visited the page before). Kept dependency
// -free and public (see middleware) so it renders without any network call.
export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          <WifiOff size={28} />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Você está offline</h1>
        <p className="mt-2 text-sm text-muted">
          Não foi possível carregar esta página sem conexão. Verifique sua
          internet e tente novamente.
        </p>
        <Button
          variant="primary"
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
