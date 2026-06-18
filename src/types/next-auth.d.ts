/* ═══════════════════════════════════════════════════════════════
   NexusAI — NextAuth type augmentations
   Extends default session/user types with custom fields
   ═══════════════════════════════════════════════════════════════ */

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: string
      language: string
    }
  }

  interface User {
    role?: string
    language?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    language: string
  }
}
