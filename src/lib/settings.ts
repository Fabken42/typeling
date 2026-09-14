import type mongoose from 'mongoose'
import { dbConnect } from '@/lib/mongoose'
import SettingsModel, { type ISettings } from '@/models/Settings'
import { DEFAULT_SETTINGS } from '@/lib/settingsDefaults'

export type PlainSettings = Omit<ISettings, '_id' | 'userId'> & {
  userId: string
}

/**
 * Lazily upserts a Settings document for the user with default values on first
 * access (spec 4.5), returning a plain object safe to send to the client.
 */
export async function getOrCreateSettings(
  userId: mongoose.Types.ObjectId,
): Promise<PlainSettings> {
  await dbConnect()
  const doc = await SettingsModel.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, ...DEFAULT_SETTINGS } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return serializeSettings(doc as unknown as ISettings)
}

export function serializeSettings(doc: ISettings): PlainSettings {
  return {
    userId: String(doc.userId),
    nativeLanguage: doc.nativeLanguage,
    ignoreDiacritics: doc.ignoreDiacritics,
    requireCorrectToAdvance: doc.requireCorrectToAdvance,
    requireSpaces: doc.requireSpaces,
    ttsEnabled: doc.ttsEnabled,
    ttsRate: doc.ttsRate,
    dailyNewLimit: doc.dailyNewLimit,
    dailyReviewLimit: doc.dailyReviewLimit,
    theme: doc.theme,
  }
}

export type ClientSettings = Omit<PlainSettings, 'userId'>
