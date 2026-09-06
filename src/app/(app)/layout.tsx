import { redirect } from 'next/navigation'
import { safeAuth } from '@/lib/session'
import { AppHeader } from '@/components/AppHeader'

// Authoritative session gate for the whole authenticated shell (spec 15). The
// middleware only does a fast cookie check; this verifies the real session.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
