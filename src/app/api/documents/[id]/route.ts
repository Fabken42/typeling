import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { serializeDocument } from '@/lib/serialize'
import { isLanguageCode } from '@/lib/languages'

type Ctx = { params: Promise<{ id: string }> }

function toObjectId(id: string): mongoose.Types.ObjectId | null {
  return mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : null
}

// GET /api/documents/:id — detail with lines.
export async function GET(_req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    const _id = toObjectId(id)
    if (!_id) return errorJson('ID inválido', 400)

    await dbConnect()
    const doc = await DocumentModel.findOne({ _id, userId }).lean()
    if (!doc) return errorJson('Documento não encontrado', 404)
    return json(serializeDocument(doc as never))
  })
}

// PATCH /api/documents/:id — title, language.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    const _id = toObjectId(id)
    if (!_id) return errorJson('ID inválido', 400)

    const body = await req.json()
    const update: Record<string, unknown> = {}
    if (typeof body.title === 'string') {
      const title = body.title.trim()
      if (!title) return errorJson('Título não pode ser vazio')
      update.title = title
    }
    if (typeof body.language === 'string') {
      if (!isLanguageCode(body.language)) return errorJson('Idioma inválido')
      update.language = body.language
    }
    if (Object.keys(update).length === 0) return errorJson('Nada para atualizar')

    await dbConnect()
    const doc = await DocumentModel.findOneAndUpdate({ _id, userId }, update, {
      new: true,
    }).lean()
    if (!doc) return errorJson('Documento não encontrado', 404)
    return json(serializeDocument(doc as never))
  })
}

// DELETE /api/documents/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    const _id = toObjectId(id)
    if (!_id) return errorJson('ID inválido', 400)

    await dbConnect()
    const res = await DocumentModel.deleteOne({ _id, userId })
    if (res.deletedCount === 0) return errorJson('Documento não encontrado', 404)
    return json({ ok: true })
  })
}
