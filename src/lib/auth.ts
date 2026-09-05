import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'

// Auth.js v5 config. Google-only, database session strategy (spec 4.1).
// The adapter uses the native MongoDB driver and manages users/accounts/
// sessions/verification_tokens. Mongoose models reference users._id via userId.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'database' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Database sessions: expose the stable user.id on the session object.
    session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
})
