import Link from 'next/link'
import { Button } from '@/components/ui/Button'

// 404 page. Rendered inside the root layout.
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-5xl font-bold text-emerald-500">404</p>
        <h1 className="mt-4 text-xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          A página que você procura não existe ou foi movida.
        </p>
        <Link href="/dashboard">
          <Button variant="primary" className="mt-6">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
