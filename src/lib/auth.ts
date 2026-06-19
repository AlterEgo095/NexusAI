/* ═══════════════════════════════════════════════════════════════
   NexusAI — NextAuth v4 Configuration
   Credentials provider + JWT sessions (no session table)
   ═══════════════════════════════════════════════════════════════ */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const isValid = await verifyPassword(credentials.password, user.password)
        if (!isValid) return null

        // Update lastSeen
        await db.user.update({
          where: { id: user.id },
          data: { isOnline: true, lastSeen: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.language = (user as { language?: string }).language || 'fr'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
        (session.user as { role: string }).role = token.role as string
        (session.user as { language: string }).language = token.language as string
      }
      return session
    },
  },
  pages: {
    // No custom pages — login/register handled via modals in SPA
    signIn: '/',
    error: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'nexusai-default-secret-change-in-production',
}