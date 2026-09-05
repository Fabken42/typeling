import mongoose from 'mongoose'
import { redirect } from 'next/navigation'
import { safeAuth } from '@/lib/session'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import { serializeDocument } from '@/lib/serialize'
import { getOrCreateSettings } from '@/lib/settings'
import { PlayClient } from './PlayClient'

// Server-rendered: the document and settings are read directly from the DB in
// one pass (no client fetch round-trips, no duplicate auth), so the game starts
// instantly instead of showing a spinner while it loads.
export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ documentId: string }>
  searchParams: Promise<{ line?: string }>
}) {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')

  const { documentId } = await params
  const { line } = await searchParams
  if (!mongoose.Types.ObjectId.isValid(documentId)) redirect('/dashboard')

  const userId = new mongoose.Types.ObjectId(session.user.id)

  await dbConnect()
  const [docRaw, settings] = await Promise.all([
    DocumentModel.findOne({ _id: new mongoose.Types.ObjectId(documentId), userId }).lean(),
    getOrCreateSettings(userId),
  ])

  if (!docRaw) redirect('/dashboard')

  const doc = serializeDocument(docRaw as never)
  const startLineNum = line != null ? Number(line) : NaN
  const startLine = Number.isFinite(startLineNum) ? startLineNum : undefined

  // Strip userId — PlayClient only needs the settings values.
  const { userId: _drop, ...clientSettings } = settings
  void _drop

  return (
    <PlayClient doc={doc} startLine={startLine} initialSettings={clientSettings} />
  )
}
