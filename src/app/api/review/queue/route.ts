import type { NextRequest } from 'next/server'
import { requireUserId } from '@/lib/session'
import { withErrors, json } from '@/lib/api'
import { buildQueue } from '@/lib/review'
import { serializeTerm } from '@/lib/serialize'

// GET /api/review/queue (?lang=&doc=) — the day's queue.
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const langsParam = searchParams.get('langs')
    const result = await buildQueue(userId, {
      lang: searchParams.get('lang'),
      langs: langsParam ? langsParam.split(',') : null,
      doc: searchParams.get('doc'),
    })
    return json({
      queue: result.queue.map((t) => serializeTerm(t as never)),
      counts: result.counts,
      nextDue: result.nextDue ? result.nextDue.toISOString() : null,
    })
  })
}
