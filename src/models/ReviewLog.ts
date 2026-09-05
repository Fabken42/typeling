import mongoose, { type Model } from 'mongoose'

// Access Schema/model/models off the default export: mongoose is CJS and its
// named exports can be undefined once Next bundles the server code.
const { Schema } = mongoose

export interface IReviewLog {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  termId: mongoose.Types.ObjectId
  rating: number // 1=Again 2=Hard 3=Good 4=Easy
  state: number
  due: Date
  stability: number
  difficulty: number
  elapsed_days: number
  last_elapsed_days: number
  scheduled_days: number
  review: Date
}

const ReviewLogSchema = new Schema<IReviewLog>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    termId: { type: Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true },
    state: { type: Number, required: true },
    due: { type: Date, required: true },
    stability: { type: Number, required: true },
    difficulty: { type: Number, required: true },
    elapsed_days: { type: Number, required: true },
    last_elapsed_days: { type: Number, required: true },
    scheduled_days: { type: Number, required: true },
    review: { type: Date, required: true },
  },
  { timestamps: false },
)

ReviewLogSchema.index({ userId: 1, review: -1 })

export const ReviewLogModel: Model<IReviewLog> =
  (mongoose.models.ReviewLog as Model<IReviewLog>) ||
  mongoose.model<IReviewLog>('ReviewLog', ReviewLogSchema)

export default ReviewLogModel
