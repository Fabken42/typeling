import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import TermModel from '@/models/Term'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { serializeTerm } from '@/lib/serialize'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/terms/:id — edit fields (term, translation, reading, sentence,
// notes, tags, suspended).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return errorJson('ID inválido', 400)
    const _id = new mongoose.Types.ObjectId(id)

    const body = await req.json()
    const update: Record<string, unknown> = {}
    if (typeof body.term === 'string') {
      const term = body.term.trim()
      if (!term) return errorJson('Termo não pode ser vazio')
      update.term = term
    }
    if (typeof body.translation === 'string') update.translation = body.translation
    if (typeof body.reading === 'string') update.reading = body.reading
    if (typeof body.sentence === 'string') update.sentence = body.sentence
    if (typeof body.notes === 'string') update.notes = body.notes
    if (Array.isArray(body.tags)) {
      update.tags = body.tags.map((t: unknown) => String(t)).filter(Boolean)
    }
    if (typeof body.suspended === 'boolean') update.suspended = body.suspended

    if (Object.keys(update).length === 0) return errorJson('Nada para atualizar')

    await dbConnect()
    const doc = await TermModel.findOneAndUpdate({ _id, userId }, update, {
      new: true,
    }).lean()
    if (!doc) return errorJson('Termo não encontrado', 404)
    return json(serializeTerm(doc as never))
  })
}

// DELETE /api/terms/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return errorJson('ID inválido', 400)
    const _id = new mongoose.Types.ObjectId(id)

    await dbConnect()
    const res = await TermModel.deleteOne({ _id, userId })
    if (res.deletedCount === 0) return errorJson('Termo não encontrado', 404)
    return json({ ok: true })
  })
}
