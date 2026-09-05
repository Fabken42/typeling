import mongoose from 'mongoose'
import { redirect } from 'next/navigation'
import { safeAuth } from '@/lib/session'
import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import { serializeDocumentSummary } from '@/lib/serialize'
import { DashboardClient } from './DashboardClient'

// Server-rendered: documents are read directly from the DB (excluding the heavy
// lines array) and handed to the client, so the grid paints immediately with no
// fetch-on-mount spinner.
export default async function DashboardPage() {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')
  const userId = new mongoose.Types.ObjectId(session.user.id)

  await dbConnect()
  const docs = await DocumentModel.find({ userId }, { lines: 0 })
    .sort({ createdAt: -1 })
    .lean()

  const initialDocs = docs.map((d) => serializeDocumentSummary(d as never))

  return <DashboardClient initialDocs={initialDocs} />
}
