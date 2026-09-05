import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import TermModel from '@/models/Term'
import { requireUserId } from '@/lib/session'
import { withErrors, json } from '@/lib/api'
import { serializeTerm } from '@/lib/serialize'

// GET /api/terms/check?term=&lang= — case-insensitive duplicate check (spec 8).
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const term = (searchParams.get('term') ?? '').trim()
    const lang = searchParams.get('lang') ?? ''
    if (!term || !lang) return json({ duplicates: [] })

    await dbConnect()
    // Exact term (case-insensitive) within the same language.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const found = await TermModel.find({
      userId,
      language: lang,
      term: { $regex: `^${escaped}$`, $options: 'i' },
    }).lean()

    return json({ duplicates: found.map((t) => serializeTerm(t as never)) })
  })
}
