import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import { requireUserId } from '@/lib/session'
import { withErrors, json, errorJson } from '@/lib/api'
import { serializeDocument, serializeDocumentSummary } from '@/lib/serialize'
import { isLanguageCode } from '@/lib/languages'

const MAX_LINES = 20000
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

// POST /api/documents — create a document from parsed lines.
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const body = await req.json()

    const title = String(body.title ?? '').trim()
    const language = String(body.language ?? '')
    const source = body.source === 'file' ? 'file' : 'text'
    const originalFileName =
      typeof body.originalFileName === 'string' ? body.originalFileName : undefined
    const lines: unknown = body.lines

    if (!title) return errorJson('Título é obrigatório')
    if (!isLanguageCode(language)) return errorJson('Idioma inválido')
    if (!Array.isArray(lines) || lines.length === 0) {
      return errorJson('É preciso ao menos 1 linha')
    }
    const cleanLines = (lines as unknown[])
      .map((l) => String(l))
      .filter((l) => l.length > 0)
    if (cleanLines.length === 0) return errorJson('É preciso ao menos 1 linha')
    if (cleanLines.length > MAX_LINES) {
      return errorJson(`Máximo de ${MAX_LINES} linhas`)
    }
    const bytes = Buffer.byteLength(cleanLines.join('\n'), 'utf8')
    if (bytes > MAX_BYTES) return errorJson('Texto excede 2 MB')

    await dbConnect()
    const doc = await DocumentModel.create({
      userId,
      title,
      language,
      source,
      originalFileName,
      lines: cleanLines,
      lineCount: cleanLines.length,
      progress: {
        currentLine: 0,
        completedLines: [],
        totalKeystrokes: 0,
        correctKeystrokes: 0,
        lastPlayedAt: null,
      },
    })

    return json(serializeDocument(doc.toObject()), 201)
  })
}

// GET /api/documents — list (?lang=&sort=&q=)
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const { searchParams } = new URL(req.url)
    const lang = searchParams.get('lang')
    const sort = searchParams.get('sort') ?? 'recent'
    const q = searchParams.get('q')?.trim()

    await dbConnect()
    const filter: Record<string, unknown> = { userId }
    if (lang && isLanguageCode(lang)) filter.language = lang
    if (q) filter.title = { $regex: q, $options: 'i' }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      recent: { createdAt: -1 },
      oldest: { createdAt: 1 },
      played: { 'progress.lastPlayedAt': -1 },
      title: { title: 1 },
    }
    const sortSpec = sortMap[sort] ?? sortMap.recent

    // Exclude the heavy `lines` array from list responses.
    const docs = await DocumentModel.find(filter, { lines: 0 })
      .sort(sortSpec)
      .lean()

    return json(docs.map((d) => serializeDocumentSummary(d as never)))
  })
}
