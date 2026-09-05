import { redirect } from 'next/navigation'
import mongoose from 'mongoose'
import { safeAuth } from '@/lib/session'
import { Header } from '@/components/Header'
import { countDueNow } from '@/lib/review'

// Authoritative session gate for the whole authenticated shell (spec 15). The
// middleware only does a fast cookie check; this verifies the real session.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')

  let initialDue = 0
  try {
    const userId = new mongoose.Types.ObjectId(session.user.id)
    initialDue = await countDueNow(userId)
  } catch {
    initialDue = 0
  }

  return (
    <div className="min-h-screen">
      <Header
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
        initialDue={initialDue}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
