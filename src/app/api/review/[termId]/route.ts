import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import TermModel from '@/models/Term'
import ReviewLogModel from '@/models/ReviewLog'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { serializeTerm } from '@/lib/serialize'
import { applyRating } from '@/lib/fsrs'

type Ctx = { params: Promise<{ termId: string }> }

// POST /api/review/:termId — schedule with ts-fsrs. Evaluation happens on the
// server so the date is trustworthy (spec 13.1).
export async function POST(req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { termId } = await params
    if (!mongoose.Types.ObjectId.isValid(termId)) {
      return errorJson('ID inválido', 400)
    }
    const _id = new mongoose.Types.ObjectId(termId)

    const body = await req.json()
    const rating = Number(body.rating)
    if (![1, 2, 3, 4].includes(rating)) return errorJson('Rating inválido')

    await dbConnect()
    const term = await TermModel.findOne({ _id, userId })
    if (!term) return errorJson('Termo não encontrado', 404)

    const now = new Date()
    const { card, log } = applyRating(term.fsrs, rating, now)

    term.fsrs = card
    term.markModified('fsrs')
    await term.save()

    await ReviewLogModel.create({
      userId,
      termId: _id,
      rating: log.rating,
      state: log.state,
      due: log.due,
      stability: log.stability,
      difficulty: log.difficulty,
      elapsed_days: log.elapsed_days,
      last_elapsed_days: log.last_elapsed_days,
      scheduled_days: log.scheduled_days,
      review: now,
    })

    return json({ term: serializeTerm(term.toObject()) })
  })
}
