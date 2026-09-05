import mongoose, { type Model } from 'mongoose'

// Access Schema/model/models off the default export: mongoose is CJS and its
// named exports can be undefined once Next bundles the server code.
const { Schema } = mongoose

export interface IProgress {
  currentLine: number
  completedLines: number[]
  totalKeystrokes: number
  correctKeystrokes: number
  lastPlayedAt?: Date | null
}

export interface IDocument {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  title: string
  language: string
  source: 'file' | 'text'
  originalFileName?: string
  lines: string[]
  lineCount: number
  progress: IProgress
  createdAt: Date
  updatedAt: Date
}

const ProgressSchema = new Schema<IProgress>(
  {
    currentLine: { type: Number, default: 0 },
    completedLines: { type: [Number], default: [] },
    totalKeystrokes: { type: Number, default: 0 },
    correctKeystrokes: { type: Number, default: 0 },
    lastPlayedAt: { type: Date, default: null },
  },
  { _id: false },
)

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    language: { type: String, required: true },
    source: { type: String, enum: ['file', 'text'], required: true },
    originalFileName: { type: String },
    lines: { type: [String], required: true },
    lineCount: { type: Number, required: true },
    progress: { type: ProgressSchema, default: () => ({}) },
  },
  { timestamps: true },
)

DocumentSchema.index({ userId: 1, createdAt: -1 })
DocumentSchema.index({ userId: 1, language: 1, createdAt: -1 })
DocumentSchema.index({ userId: 1, 'progress.lastPlayedAt': -1 })

export const DocumentModel: Model<IDocument> =
  (mongoose.models.Document as Model<IDocument>) ||
  mongoose.model<IDocument>('Document', DocumentSchema)

export default DocumentModel
