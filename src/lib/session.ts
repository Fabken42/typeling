import { cache } from 'react'
import mongoose from 'mongoose'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

/**
 * Per-request memoized session lookup. A single page render calls auth() from
 * the layout, the header and the page — cache() dedupes them into one DB query
 * per request (React clears the cache between requests).
 */
const cachedAuth = cache(() => auth())

/**
 * Like auth(), but never throws: if the session lookup fails (e.g. the database
 * is unreachable), it logs and returns null instead of crashing the page. Use
 * this in server components/layouts so a DB hiccup degrades gracefully (public
 * pages still render; protected pages redirect to /login) rather than 500ing.
 */
export async function safeAuth(): Promise<Session | null> {
  try {
    return await cachedAuth()
  } catch (err) {
    console.error(
      '[auth] session lookup failed (database unreachable?):',
      err instanceof Error ? err.message : err,
    )
    return null
  }
}

/**
 * Returns the authenticated user's id as a Mongoose ObjectId, or throws
 * UnauthorizedError. Every API route must call this and filter all queries by
 * the returned userId (spec section 15).
 */
export async function requireUserId(): Promise<mongoose.Types.ObjectId> {
  const session = await cachedAuth()
  const id = session?.user?.id
  if (!id) throw new UnauthorizedError()
  return new mongoose.Types.ObjectId(id)
}

export async function getSessionUser() {
  const session = await cachedAuth()
  return session?.user ?? null
}
