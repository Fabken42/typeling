import type { NextRequest } from 'next/server'
import { requireUserId } from '@/lib/session'
import { withErrors, json } from '@/lib/api'
import { getReviewStats } from '@/lib/review'

// GET /api/review/stats — counts for badges (nav + "Revisar agora").
// Uses count-only queries (getReviewStats), not the full queue build.
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const stats = await getReviewStats(userId, {
      lang: searchParams.get('lang'),
      doc: searchParams.get('doc'),
    })
    return json(stats)
  })
}
