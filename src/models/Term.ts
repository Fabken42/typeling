import mongoose, { type Model } from 'mongoose'

// Access Schema/model/models off the default export: mongoose is CJS and its
// named exports can be undefined once Next bundles the server code.
const { Schema } = mongoose

// The fsrs sub-object is stored whole with strict:false so future ts-fsrs
// versions that add fields don't break persistence (spec 4.3).
export interface IFsrs {
  due: Date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review?: Date | null
  learning_steps?: number
  [key: string]: unknown
}

export interface ITerm {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  language: string
  term: string
  reading?: string
  translation: string
  sentence: string
  notes?: string
  tags: string[]
  documentId?: mongoose.Types.ObjectId | null
  lineIndex?: number | null
  suspended: boolean
  fsrs: IFsrs
  createdAt: Date
  updatedAt: Date
}

const FsrsSchema = new Schema(
  {},
  { _id: false, strict: false, minimize: false },
)

const TermSchema = new Schema<ITerm>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    language: { type: String, required: true },
    term: { type: String, required: true },
    reading: { type: String },
    translation: { type: String, default: '' },
    sentence: { type: String, default: '' },
    notes: { type: String },
    tags: { type: [String], default: [] },
    documentId: { type: Schema.Types.ObjectId, default: null },
    lineIndex: { type: Number, default: null },
    suspended: { type: Boolean, default: false },
    fsrs: { type: FsrsSchema, required: true },
  },
  { timestamps: true },
)

TermSchema.index({ userId: 1, 'fsrs.due': 1 })
TermSchema.index({ userId: 1, createdAt: -1 })
TermSchema.index({ userId: 1, language: 1, createdAt: -1 })
TermSchema.index({ userId: 1, term: 1 })

export const TermModel: Model<ITerm> =
  (mongoose.models.Term as Model<ITerm>) ||
  mongoose.model<ITerm>('Term', TermSchema)

export default TermModel
