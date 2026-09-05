import mongoose, { type Model } from 'mongoose'

// Access Schema/model/models off the default export: mongoose is CJS and its
// named exports can be undefined once Next bundles the server code.
const { Schema } = mongoose

export interface ITranslationCache {
  _id: mongoose.Types.ObjectId
  key: string // `${sourceLang}:${targetLang}:${text}`
  text: string
  translation: string
  createdAt: Date
}

const TranslationCacheSchema = new Schema<ITranslationCache>({
  key: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  translation: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const TranslationCacheModel: Model<ITranslationCache> =
  (mongoose.models.TranslationCache as Model<ITranslationCache>) ||
  mongoose.model<ITranslationCache>('TranslationCache', TranslationCacheSchema)

export default TranslationCacheModel
