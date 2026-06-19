/* ═══════════════════════════════════════════════════════════════
   NexusAI — WebAuthn Server Library
   Handles passkey registration & authentication (server-side only)
   ═══════════════════════════════════════════════════════════════ */

import { db } from '@/lib/db'

// Dynamic import — @simplewebauthn/server is server-only
type ServerLib = typeof import('@simplewebauthn/server')
let _server: ServerLib | null = null
async function getServer(): Promise<ServerLib> {
  if (!_server) {
    _server = await import('@simplewebauthn/server')
  }
  return _server
}

export const RP_NAME = 'NexusAI Admin'
export const RP_ID = process.env.WEBAUTHN_RP_ID || 'nexus.aenews.net'
export const ORIGIN = process.env.NEXTAUTH_URL || 'https://nexus.aenews.net'

/* ─── In-memory challenge store ─── */
interface ChallengeEntry {
  userId: string
  expiresAt: number
  type: 'registration' | 'authentication'
}

const challenges = new Map<string, ChallengeEntry>()

function cleanChallenges() {
  const now = Date.now()
  for (const [key, val] of challenges) {
    if (val.expiresAt < now) challenges.delete(key)
  }
}

export function storeChallenge(
  challenge: string,
  userId: string,
  type: 'registration' | 'authentication'
) {
  cleanChallenges()
  challenges.set(challenge, { userId, expiresAt: Date.now() + 5 * 60 * 1000, type })
}

export function consumeChallenge(
  challenge: string
): { userId: string; type: 'registration' | 'authentication' } | null {
  const entry = challenges.get(challenge)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    challenges.delete(challenge)
    return null
  }
  challenges.delete(challenge)
  return { userId: entry.userId, type: entry.type }
}

/* ─── Status helpers ─── */

export async function hasRegisteredCredentials(): Promise<boolean> {
  const count = await db.webAuthnCredential.count()
  return count > 0
}

export async function getCredentialCount(): Promise<number> {
  return db.webAuthnCredential.count()
}

/* ─── Registration ─── */

export async function beginRegistration(userId: string) {
  const server = await getServer()
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  // Existing credentials to exclude (prevent re-registration of same device)
  const existingCredentials = await db.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialID: true },
  })

  const excludeList = existingCredentials
    .map((c) => {
      try {
        return Buffer.from(c.credentialID, 'base64url')
      } catch {
        return new Uint8Array(0)
      }
    })
    .filter((b) => b.length > 0)

  const options = await server.generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name,
    excludeCredentials: excludeList.map((id) => ({
      id,
      type: 'public-key' as const,
      transports: [] as string[],
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 120000,
    attestation: 'none',
  })

  storeChallenge(options.challenge, userId, 'registration')

  return options
}

export async function finishRegistration(
  userId: string,
  credential: any,
  rawChallenge: string
) {
  const server = await getServer()

  const verification = await server.verifyRegistration({
    response: credential,
    expectedChallenge: rawChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('WebAuthn registration verification failed')
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

  // Store credential in database
  await db.webAuthnCredential.create({
    data: {
      userId,
      credentialID: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
      deviceName: credential.deviceName || 'Security Key',
      transports: JSON.stringify(credential.response?.transports || []),
    },
  })

  return { verified: true, credentialID: Buffer.from(credentialID).toString('base64url') }
}

/* ─── Authentication ─── */

export async function beginAuthentication() {
  const server = await getServer()

  const credentials = await db.webAuthnCredential.findMany()
  if (credentials.length === 0) {
    throw new Error('No WebAuthn credentials registered')
  }

  const allowCredentials = credentials.map((c) => ({
    id: Buffer.from(c.credentialID, 'base64url'),
    type: 'public-key' as const,
    transports: c.transports ? (JSON.parse(c.transports) as string[]) : undefined,
  }))

  const options = await server.generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'required',
    timeout: 120000,
  })

  // Store challenge — associate with first credential's userId
  storeChallenge(options.challenge, credentials[0].userId, 'authentication')

  return options
}

export async function finishAuthentication(credential: any, rawChallenge: string) {
  const server = await getServer()

  // Find the stored credential by ID
  const credId = Buffer.from(credential.rawId).toString('base64url')
  const storedCredential = await db.webAuthnCredential.findUnique({
    where: { credentialID: credId },
  })

  if (!storedCredential) {
    throw new Error('Credential not found')
  }

  const verification = await server.verifyAuthentication({
    response: credential.response,
    expectedChallenge: rawChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(storedCredential.credentialID, 'base64url'),
      credentialPublicKey: Buffer.from(storedCredential.publicKey, 'base64url'),
      counter: storedCredential.counter,
      transports: storedCredential.transports ? JSON.parse(storedCredential.transports) : [],
    },
    requireUserVerification: true,
  })

  if (!verification.verified) {
    throw new Error('WebAuthn authentication verification failed')
  }

  // Update counter and lastUsed
  await db.webAuthnCredential.update({
    where: { credentialID: credId },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsed: new Date(),
    },
  })

  // Return the user
  const user = await db.user.findUnique({ where: { id: storedCredential.userId } })
  return { verified: true, user }
}
