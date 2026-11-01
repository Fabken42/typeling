import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'

// Auth.js v5 config. Google-only. The adapter still persists users/accounts on
// sign-in, but the session itself is a stateless JWT (not a DB row): validating
// a request reads and verifies the signed cookie instead of querying MongoDB, so
// every page load / API call avoids an extra session round-trip to the database.
// Mongoose models reference users._id via userId, carried on the token as `id`.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: 'jwt' },
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
    // Persist the adapter user id on the token at sign-in (when `user` is set),
    // then expose it as the stable session.user.id on every request.
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string
      return session
    },
  },
})
