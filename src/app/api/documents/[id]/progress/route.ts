import type { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

// POST (not PATCH) so navigator.sendBeacon can flush on visibilitychange
// (spec 6.7). The body may arrive as a JSON Blob from the beacon.
export async function POST(req: NextRequest, { params }: Ctx) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return errorJson('ID inválido', 400)
    const _id = new mongoose.Types.ObjectId(id)

    let body: Record<string, unknown> = {}
    try {
      body = await req.json()
    } catch {
      try {
        body = JSON.parse(await req.text())
      } catch {
        return errorJson('Corpo inválido')
      }
    }

    await dbConnect()
    const doc = await DocumentModel.findOne({ _id, userId })
    if (!doc) return errorJson('Documento não encontrado', 404)

    const currentLine = Number(body.currentLine)
    if (Number.isFinite(currentLine)) {
      doc.progress.currentLine = Math.max(
        0,
        Math.min(Math.trunc(currentLine), doc.lineCount - 1),
      )
    }

    // Union with existing completed lines so out-of-order flushes never regress
    // progress (spec acceptance criterion 8).
    if (Array.isArray(body.completedLines)) {
      const incoming = (body.completedLines as unknown[])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < doc.lineCount)
      const merged = new Set<number>([...doc.progress.completedLines, ...incoming])
      doc.progress.completedLines = Array.from(merged).sort((a, b) => a - b)
    }

    // Keystrokes only ever grow; take the max so a stale flush can't regress them.
    if (Number.isFinite(Number(body.totalKeystrokes))) {
      doc.progress.totalKeystrokes = Math.max(
        doc.progress.totalKeystrokes,
        Number(body.totalKeystrokes),
      )
    }
    if (Number.isFinite(Number(body.correctKeystrokes))) {
      doc.progress.correctKeystrokes = Math.max(
        doc.progress.correctKeystrokes,
        Number(body.correctKeystrokes),
      )
    }
    doc.progress.lastPlayedAt = new Date()

    await doc.save()
    return json({ ok: true })
  })
}
