import { db } from '@/lib/db'
import { generateRefreshToken, hashRefreshToken, getRefreshTokenExpiry } from './token'
import { logSecurityEvent } from '@/lib/security/audit'

export interface RotationResult {
  newRaw: string
  newHash: string
  userId: string
}

export interface ReplayDetectedResult {
  replayDetected: true
  userId: string
}

/**
 * Rotate a refresh token with family-based replay detection.
 *
 * Algorithm:
 * 1. Find token record by hash
 * 2. If token.replacedBy is set → this token was already used → REPLAY ATTACK
 * 3. If replay: revoke ALL tokens in the family, log critical event
 * 4. If valid: mark old as replaced, create new with same familyId
 */
export async function rotateRefreshToken(
  oldTokenHash: string,
  req: { headers: { get(name: string): string | null }; nextUrl: { pathname: string }; method: string },
): Promise<RotationResult | ReplayDetectedResult> {
  // 1. Find the old token
  const oldToken = await db.refreshToken.findUnique({
    where: { tokenHash: oldTokenHash },
  })

  if (!oldToken) {
    throw new Error('Refresh token not found')
  }

  // 2. Replay detection: if this token was already replaced, it's a reuse
  if (oldToken.replacedBy) {
    // REPLAY ATTACK DETECTED — revoke entire token family
    await db.refreshToken.updateMany({
      where: { tokenFamilyId: oldToken.tokenFamilyId },
      data: { revokedAt: new Date() },
    })

    logSecurityEvent({
      type: 'token_replay_detected',
      level: 'critical',
      userId: oldToken.userId,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
      userAgent: req.headers.get('user-agent') ?? 'unknown',
      path: req.nextUrl.pathname,
      method: req.method,
      details: `Token reuse detected in family ${oldToken.tokenFamilyId}. Entire family revoked.`,
    })

    return { replayDetected: true, userId: oldToken.userId }
  }

  // 3. Generate new token
  const { raw: newRaw, hash: newHash } = generateRefreshToken()

  // 4. Mark old token as replaced
  await db.refreshToken.update({
    where: { tokenHash: oldTokenHash },
    data: { replacedBy: newHash },
  })

  // 5. Create new token in same family
  await db.refreshToken.create({
    data: {
      tokenHash: newHash,
      userId: oldToken.userId,
      tokenFamilyId: oldToken.tokenFamilyId,
      userAgent: req.headers.get('user-agent') ?? 'unknown',
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
      expiresAt: getRefreshTokenExpiry(),
    },
  })

  return { newRaw, newHash, userId: oldToken.userId }
}
