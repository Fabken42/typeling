import type { NextRequest } from 'next/server'
import { dbConnect } from '@/lib/mongoose'
import SettingsModel from '@/models/Settings'
import { requireUserId } from '@/lib/session'
import { withErrors, json } from '@/lib/api'
import { getOrCreateSettings, serializeSettings } from '@/lib/settings'
import { NATIVE_LANGUAGES } from '@/lib/languages'

// GET /api/settings — lazy upsert with defaults.
export async function GET() {
  return withErrors(async () => {
    const userId = await requireUserId()
    const settings = await getOrCreateSettings(userId)
    return json(settings)
  })
}

const NATIVE_CODES = NATIVE_LANGUAGES.map((n) => n.code)

// PATCH /api/settings — update known fields with light validation.
export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const userId = await requireUserId()
    const body = await req.json()
    const update: Record<string, unknown> = {}

    if (typeof body.nativeLanguage === 'string' && NATIVE_CODES.includes(body.nativeLanguage as never)) {
      update.nativeLanguage = body.nativeLanguage
    }
    if (typeof body.ignoreDiacritics === 'boolean') update.ignoreDiacritics = body.ignoreDiacritics
    if (typeof body.requireCorrectToAdvance === 'boolean') update.requireCorrectToAdvance = body.requireCorrectToAdvance
    if (typeof body.requireSpaces === 'boolean') update.requireSpaces = body.requireSpaces
    if (typeof body.ttsEnabled === 'boolean') update.ttsEnabled = body.ttsEnabled
    if (typeof body.ttsRate === 'number') {
      update.ttsRate = Math.min(1.5, Math.max(0.5, body.ttsRate))
    }
    if (Number.isInteger(body.dailyNewLimit)) {
      update.dailyNewLimit = Math.max(0, Math.min(9999, body.dailyNewLimit))
    }
    if (Number.isInteger(body.dailyReviewLimit)) {
      update.dailyReviewLimit = Math.max(0, Math.min(99999, body.dailyReviewLimit))
    }
    if (['dark', 'light', 'system'].includes(body.theme)) update.theme = body.theme

    await dbConnect()
    const doc = await SettingsModel.findOneAndUpdate({ userId }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).lean()

    return json(serializeSettings(doc as never))
  })
}
