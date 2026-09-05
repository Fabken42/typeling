import mongoose from 'mongoose'
import { redirect } from 'next/navigation'
import { safeAuth } from '@/lib/session'
import { buildQueue } from '@/lib/review'
import { serializeTerm } from '@/lib/serialize'
import { getOrCreateSettings } from '@/lib/settings'
import { ReviewClient } from './ReviewClient'

// Server-rendered: the day's queue is built on the server and handed to the
// client, so the first card shows immediately without a fetch-on-mount spinner.
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; doc?: string }>
}) {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')
  const userId = new mongoose.Types.ObjectId(session.user.id)

  const { lang, doc } = await searchParams
  const [result, settings] = await Promise.all([
    buildQueue(userId, { lang, doc }),
    getOrCreateSettings(userId),
  ])

  const initialData = {
    queue: result.queue.map((t) => serializeTerm(t as never)),
    counts: result.counts,
    nextDue: result.nextDue ? result.nextDue.toISOString() : null,
  }

  const { userId: _drop, ...clientSettings } = settings
  void _drop

  return <ReviewClient initialData={initialData} initialSettings={clientSettings} />
}
