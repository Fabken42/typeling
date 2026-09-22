import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import TermModel from '@/models/Term'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { serializeTerm } from '@/lib/serialize'
import { isLanguageCode } from '@/lib/languages'
import { newCard } from '@/lib/fsrs'

// POST /api/terms — create a term/card.
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const body = await req.json()

    const term = String(body.term ?? '').trim()
    const language = String(body.language ?? '')
    const translation = String(body.translation ?? '').trim()
    const sentence = String(body.sentence ?? '')

    if (!term) return errorJson('Termo é obrigatório')
    if (!isLanguageCode(language)) return errorJson('Idioma inválido')

    const appendToId =
      typeof body.appendToTermId === 'string' &&
      mongoose.Types.ObjectId.isValid(body.appendToTermId)
        ? new mongoose.Types.ObjectId(body.appendToTermId)
        : null

    await dbConnect()

    // Duplicate handling: update the existing card to the most recently added
    // example sentence, replacing the previous one (spec 8).
    if (appendToId) {
      const existing = await TermModel.findOne({ _id: appendToId, userId })
      if (!existing) return errorJson('Card não encontrado', 404)
      existing.sentence = sentence
      await existing.save()
      return json(serializeTerm(existing.toObject()), 200)
    }

    const documentId =
      typeof body.documentId === 'string' &&
      mongoose.Types.ObjectId.isValid(body.documentId)
        ? new mongoose.Types.ObjectId(body.documentId)
        : null
    const lineIndex =
      Number.isInteger(body.lineIndex) && body.lineIndex >= 0
        ? body.lineIndex
        : null

    const doc = await TermModel.create({
      userId,
      language,
      term,
      reading: body.reading ? String(body.reading).trim() : undefined,
      translation,
      sentence,
      notes: body.notes ? String(body.notes) : undefined,
      tags: Array.isArray(body.tags)
        ? body.tags.map((t: unknown) => String(t)).filter(Boolean)
        : [],
      documentId,
      lineIndex,
      suspended: false,
      fsrs: newCard(),
    })

    return json(serializeTerm(doc.toObject()), 201)
  })
}

// GET /api/terms — list (?lang=&doc=&q=&sort=&suspended=&limit=&skip=)
// Paginated via limit/skip (the vocabulary page loads 50 at a time).
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const lang = searchParams.get('lang')
    const doc = searchParams.get('doc')
    const q = searchParams.get('q')?.trim()
    const sort = searchParams.get('sort') ?? 'recent'
    const suspended = searchParams.get('suspended')
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 0))
    const skip = Math.max(0, Number(searchParams.get('skip')) || 0)

    await dbConnect()
    const filter: Record<string, unknown> = { userId }
    if (lang && isLanguageCode(lang)) filter.language = lang
    if (doc && mongoose.Types.ObjectId.isValid(doc)) {
      filter.documentId = new mongoose.Types.ObjectId(doc)
    }
    if (suspended === 'true') filter.suspended = true
    if (q) {
      filter.$or = [
        { term: { $regex: q, $options: 'i' } },
        { translation: { $regex: q, $options: 'i' } },
      ]
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      recent: { createdAt: -1 },
      oldest: { createdAt: 1 },
      alpha: { term: 1 },
      due: { 'fsrs.due': 1 },
    }
    const sortSpec = sortMap[sort] ?? sortMap.recent

    let query = TermModel.find(filter).sort(sortSpec)
    // limit=0 (or absent) means "no pagination" — return everything.
    if (limit > 0) query = query.skip(skip).limit(limit)
    const terms = await query.lean()
    return json(terms.map((t) => serializeTerm(t as never)))
  })
}
