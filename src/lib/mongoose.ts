import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment')
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = global as unknown as { __mongoose?: MongooseCache }

const cached: MongooseCache =
  globalForMongoose.__mongoose ?? { conn: null, promise: null }
globalForMongoose.__mongoose = cached

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false })
  }
  cached.conn = await cached.promise
  return cached.conn
}
