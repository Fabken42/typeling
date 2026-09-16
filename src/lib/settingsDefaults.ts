// Framework-agnostic settings shape and defaults. This file must NOT import
// mongoose (or anything server-only): it is imported by client code
// (settingsStore) as well as the Mongoose model, so keeping it dependency-free
// prevents Mongoose from being pulled into the browser bundle.

export interface SettingsValues {
  nativeLanguage: string
  ignoreDiacritics: boolean
  requireCorrectToAdvance: boolean
  requireSpaces: boolean
  ttsEnabled: boolean
  ttsAutoPlay: boolean
  ttsRate: number
  dailyNewLimit: number
  dailyReviewLimit: number
  theme: 'dark' | 'light' | 'system'
}

export const DEFAULT_SETTINGS: SettingsValues = {
  nativeLanguage: 'pt-BR',
  ignoreDiacritics: false,
  requireCorrectToAdvance: false,
  requireSpaces: true,
  ttsEnabled: true,
  ttsAutoPlay: false,
  ttsRate: 0.9,
  dailyNewLimit: 20,
  dailyReviewLimit: 200,
  theme: 'dark',
}

// The settings a client works with (no _id / userId).
export type ClientSettings = SettingsValues
