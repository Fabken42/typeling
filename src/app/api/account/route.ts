import { dbConnect } from '@/lib/mongoose'
import DocumentModel from '@/models/Document'
import TermModel from '@/models/Term'
import ReviewLogModel from '@/models/ReviewLog'
import SettingsModel from '@/models/Settings'
import { requireUserId } from '@/lib/session'
import { withErrors, json } from '@/lib/api'

// DELETE /api/account — wipe all of the user's Typeling data (spec 14).
// Auth records (users/accounts/sessions) are left to the OAuth provider / adapter.
export async function DELETE() {
  return withErrors(async () => {
    const userId = await requireUserId()
    await dbConnect()
    await Promise.all([
      DocumentModel.deleteMany({ userId }),
      TermModel.deleteMany({ userId }),
      ReviewLogModel.deleteMany({ userId }),
      SettingsModel.deleteMany({ userId }),
    ])
    return json({ ok: true })
  })
}
