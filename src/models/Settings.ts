import mongoose, { type Model } from 'mongoose'
import { DEFAULT_SETTINGS, type SettingsValues } from '@/lib/settingsDefaults'

// Access Schema/model/models off the default export: mongoose is CJS and its
// named exports can be undefined once Next bundles the server code.
const { Schema } = mongoose

// Re-exported for server-side importers (defaults live in a mongoose-free
// module so client code can use them without pulling mongoose into the bundle).
export { DEFAULT_SETTINGS }

export interface ISettings extends SettingsValues {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
}

const SettingsSchema = new Schema<ISettings>({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  nativeLanguage: { type: String, default: DEFAULT_SETTINGS.nativeLanguage },
  ignoreDiacritics: { type: Boolean, default: DEFAULT_SETTINGS.ignoreDiacritics },
  requireCorrectToAdvance: {
    type: Boolean,
    default: DEFAULT_SETTINGS.requireCorrectToAdvance,
  },
  requireSpaces: { type: Boolean, default: DEFAULT_SETTINGS.requireSpaces },
  ttsEnabled: { type: Boolean, default: DEFAULT_SETTINGS.ttsEnabled },
  ttsAutoPlay: { type: Boolean, default: DEFAULT_SETTINGS.ttsAutoPlay },
  ttsRate: { type: Number, default: DEFAULT_SETTINGS.ttsRate },
  dailyNewLimit: { type: Number, default: DEFAULT_SETTINGS.dailyNewLimit },
  dailyReviewLimit: { type: Number, default: DEFAULT_SETTINGS.dailyReviewLimit },
  theme: { type: String, default: DEFAULT_SETTINGS.theme },
})

export const SettingsModel: Model<ISettings> =
  (mongoose.models.Settings as Model<ISettings>) ||
  mongoose.model<ISettings>('Settings', SettingsSchema)

export default SettingsModel
