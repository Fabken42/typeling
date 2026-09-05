import { MongoClient } from 'mongodb'

// A single shared MongoClient promise for the Auth.js adapter (native driver).
// This coexists with the cached Mongoose connection (see mongoose.ts); both
// read the same MONGODB_URI. See spec section 4.1.

const uri = process.env.MONGODB_URI
if (!uri) {
  throw new Error('MONGODB_URI is not defined in the environment')
}

const options = {}

let clientPromise: Promise<MongoClient>

const globalForMongo = global as unknown as {
  __mongoClientPromise?: Promise<MongoClient>
}

if (process.env.NODE_ENV === 'development') {
  if (!globalForMongo.__mongoClientPromise) {
    const client = new MongoClient(uri, options)
    globalForMongo.__mongoClientPromise = client.connect()
  }
  clientPromise = globalForMongo.__mongoClientPromise
} else {
  const client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise
