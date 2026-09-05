import type { IDocument } from '@/models/Document'
import type { ITerm, IFsrs } from '@/models/Term'

// Full progress (with the completedLines array) — needed by the game.
export interface DocumentProgressDTO {
  currentLine: number
  completedLines: number[]
  totalKeystrokes: number
  correctKeystrokes: number
  lastPlayedAt: string | null
}

// Summary progress for listings: only the count, not the whole array — the
// dashboard just needs completedCount for the progress bar (avoids shipping
// thousands of line indices across many documents).
export interface DocumentSummaryProgressDTO {
  currentLine: number
  completedCount: number
  totalKeystrokes: number
  correctKeystrokes: number
  lastPlayedAt: string | null
}

export interface DocumentSummaryDTO {
  id: string
  title: string
  language: string
  source: 'file' | 'text'
  lineCount: number
  progress: DocumentSummaryProgressDTO
  createdAt: string
  updatedAt: string
}

export interface DocumentDTO extends Omit<DocumentSummaryDTO, 'progress'> {
  progress: DocumentProgressDTO
  lines: string[]
  originalFileName?: string
}

export interface TermDTO {
  id: string
  language: string
  term: string
  reading?: string
  translation: string
  sentence: string
  notes?: string
  tags: string[]
  documentId: string | null
  lineIndex: number | null
  suspended: boolean
  fsrs: IFsrs
  createdAt: string
  updatedAt: string
}

function fullProgressDTO(p: IDocument['progress']): DocumentProgressDTO {
  return {
    currentLine: p?.currentLine ?? 0,
    completedLines: p?.completedLines ?? [],
    totalKeystrokes: p?.totalKeystrokes ?? 0,
    correctKeystrokes: p?.correctKeystrokes ?? 0,
    lastPlayedAt: p?.lastPlayedAt ? new Date(p.lastPlayedAt).toISOString() : null,
  }
}

function summaryProgressDTO(
  p: IDocument['progress'],
): DocumentSummaryProgressDTO {
  return {
    currentLine: p?.currentLine ?? 0,
    completedCount: p?.completedLines?.length ?? 0,
    totalKeystrokes: p?.totalKeystrokes ?? 0,
    correctKeystrokes: p?.correctKeystrokes ?? 0,
    lastPlayedAt: p?.lastPlayedAt ? new Date(p.lastPlayedAt).toISOString() : null,
  }
}

export function serializeDocumentSummary(doc: IDocument): DocumentSummaryDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    language: doc.language,
    source: doc.source,
    lineCount: doc.lineCount,
    progress: summaryProgressDTO(doc.progress),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  }
}

export function serializeDocument(doc: IDocument): DocumentDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    language: doc.language,
    source: doc.source,
    lineCount: doc.lineCount,
    progress: fullProgressDTO(doc.progress),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
    lines: doc.lines,
    originalFileName: doc.originalFileName,
  }
}

export function serializeTerm(t: ITerm): TermDTO {
  return {
    id: String(t._id),
    language: t.language,
    term: t.term,
    reading: t.reading,
    translation: t.translation,
    sentence: t.sentence,
    notes: t.notes,
    tags: t.tags ?? [],
    documentId: t.documentId ? String(t.documentId) : null,
    lineIndex: t.lineIndex ?? null,
    suspended: t.suspended,
    fsrs: t.fsrs,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
  }
}
