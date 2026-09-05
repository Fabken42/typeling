import mongoose from 'mongoose'
import { redirect } from 'next/navigation'
import { safeAuth } from '@/lib/session'
import { dbConnect } from '@/lib/mongoose'
import TermModel from '@/models/Term'
import { serializeTerm } from '@/lib/serialize'
import { getReviewStats } from '@/lib/review'
import { VocabularyClient } from './VocabularyClient'

const PAGE_SIZE = 50

// Server-rendered: the first page (50), the languages the user actually has,
// and the "Revisar agora" count come from the DB. The client loads more pages
// on demand ("Carregar mais") and searches server-side.
export default async function VocabularyPage() {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')
  const userId = new mongoose.Types.ObjectId(session.user.id)

  await dbConnect()
  const [terms, langs, stats] = await Promise.all([
    TermModel.find({ userId }).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    TermModel.distinct('language', { userId }),
    getReviewStats(userId),
  ])

  const initialTerms = terms.map((t) => serializeTerm(t as never))

  return (
    <VocabularyClient
      initialTerms={initialTerms}
      initialHasMore={initialTerms.length === PAGE_SIZE}
      initialDueCount={stats.queued}
      availableLangs={(langs as string[]).filter(Boolean)}
    />
  )
}
