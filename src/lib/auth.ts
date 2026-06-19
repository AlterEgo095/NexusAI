/* ═══════════════════════════════════════════════════════════════
   NexusAI — NextAuth v4 Configuration
   Credentials provider + JWT sessions (no session table)
   ═══════════════════════════════════════════════════════════════ */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { logSecurityEvent } from '@/lib/security-audit'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

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

        if (!user || !user.password) {
          await logSecurityEvent('login_failed', undefined, `Unknown user: ${credentials.email}`, 'warning')
          return null
        }

        // Check if account is locked due to too many failed attempts
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          await logSecurityEvent('account_locked', undefined, `Locked account login attempt: ${user.email}`, 'warning')
          return null
        }

        const isValid = await verifyPassword(credentials.password, user.password)
        if (!isValid) {
          // Increment failed login attempts
          const now = new Date()
          const newFailedCount = user.failedLoginAttempts + 1
          const lockUntil = newFailedCount >= MAX_FAILED_ATTEMPTS
            ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
            : null

          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newFailedCount,
              ...(lockUntil ? { lockedUntil: lockUntil } : {}),
            },
          })

          await logSecurityEvent('login_failed', undefined, `User: ${user.email}, attempt ${newFailedCount}/${MAX_FAILED_ATTEMPTS}${lockUntil ? ' — ACCOUNT LOCKED' : ''}`, lockUntil ? 'critical' : 'warning')

          return null
        }

        // Successful login — reset failed attempts and clear lockout
        await db.user.update({
          where: { id: user.id },
          data: {
            isOnline: true,
            lastSeen: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        })

        await logSecurityEvent('login_success', undefined, `User: ${user.email}`, 'info')

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
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: 'nexusai.session-token',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
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
  secret: process.env.NEXTAUTH_SECRET,
}
