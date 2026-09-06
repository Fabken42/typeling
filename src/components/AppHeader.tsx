import mongoose from 'mongoose'
import { safeAuth } from '@/lib/session'
import { Header } from '@/components/Header'
import { getReviewStats } from '@/lib/review'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'

// Shared authenticated header. Rendered by every logged-in shell (the app group
// and the game) so the global nav is always present. Returns null when there is
// no session — the surrounding layout/page is responsible for the redirect gate.
export async function AppHeader() {
  const session = await safeAuth()
  if (!session?.user?.id) return null

  const userId = new mongoose.Types.ObjectId(session.user.id)

  // The badge must match what the /review queue actually serves: due review
  // cards *plus* the day's new cards (within the daily limits), i.e. `queued`.
  // The "Continuar" shortcut points at the most recently played document so the
  // user can jump back into the game from anywhere (e.g. /review) in one click.
  let initialQueued = 0
  let lastPlayed: { id: string; title: string } | null = null
  try {
    await dbConnect()
    const [stats, doc] = await Promise.all([
      getReviewStats(userId),
      DocumentModel.findOne(
        { userId, 'progress.lastPlayedAt': { $ne: null } },
        { title: 1 },
      )
        .sort({ 'progress.lastPlayedAt': -1 })
        .lean(),
    ])
    initialQueued = stats.queued
    if (doc) lastPlayed = { id: String(doc._id), title: doc.title }
  } catch {
    initialQueued = 0
    lastPlayed = null
  }

  return (
    <Header
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      initialQueued={initialQueued}
      lastPlayed={lastPlayed}
    />
  )
}
