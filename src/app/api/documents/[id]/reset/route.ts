import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { serializeDocument } from '@/lib/serialize'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/documents/:id/reset — zero the progress.
export async function POST(_req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return errorJson('ID inválido', 400)
    const _id = new mongoose.Types.ObjectId(id)

    await dbConnect()
    const doc = await DocumentModel.findOneAndUpdate(
      { _id, userId },
      {
        $set: {
          'progress.currentLine': 0,
          'progress.totalKeystrokes': 0,
          'progress.correctKeystrokes': 0,
          'progress.lastPlayedAt': null,
        },
      },
      { new: true },
    ).lean()
    if (!doc) return errorJson('Documento não encontrado', 404)
    return json(serializeDocument(doc as never))
  })
}
