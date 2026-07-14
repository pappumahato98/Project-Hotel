import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Support legacy SHA-256 hashes during migration
  if (hashedPassword.length === 64 && /^[0-9a-f]{64}$/.test(hashedPassword)) {
    const { createHash } = await import('crypto')
    const sha256Hash = createHash('sha256').update(password).digest('hex')
    if (sha256Hash === hashedPassword) {
      // Legacy hash matched — return true but caller should rehash
      return true
    }
    return false
  }
  // Modern bcrypt verification
  return bcrypt.compare(password, hashedPassword)
}

export function isLegacyHash(hash: string): boolean {
  return hash.length === 64 && /^[0-9a-f]{64}$/.test(hash)
}