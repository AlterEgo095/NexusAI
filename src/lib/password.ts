import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('Le mot de passe doit contenir au moins 8 caractères')
  if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule')
  if (!/[a-z]/.test(password)) errors.push('Au moins une minuscule')
  if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre')
  return { valid: errors.length === 0, errors }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}