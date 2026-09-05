import mongoose from 'mongoose'
import { redirect } from 'next/navigation'
import { safeAuth } from '@/lib/session'
import { getOrCreateSettings } from '@/lib/settings'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await safeAuth()
  if (!session?.user?.id) redirect('/login')

  const userId = new mongoose.Types.ObjectId(session.user.id)
  const settings = await getOrCreateSettings(userId)
  const { userId: _drop, ...initialSettings } = settings
  void _drop

  return (
    <SettingsClient
      email={session.user.email ?? ''}
      name={session.user.name ?? ''}
      initialSettings={initialSettings}
    />
  )
}
