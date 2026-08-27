/**
 * Server-side authentication utilities for API routes.
 *
 * The current auth model:
 *   - Login returns a UUID token + user object, but the token is NOT stored in the DB.
 *   - The client stores { user, token } in localStorage under key "meridian-auth".
 *   - To identify users on subsequent requests the client sends:
 *       x-user-id  <user.id>
 *     and optionally:
 *       Authorization: Bearer <token>
 *
 * These helpers extract the user identity from the request and validate it
 * against the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiUnauthorized, apiForbidden } from '@/lib/api-response'

// ─── Types ──────────────────────────────────────────────────────

/** User object returned after authentication, with password stripped. */
export type SessionUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  department: string
  position: string
  avatarUrl: string | null
  phone: string | null
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  city: string | null
  country: string | null
  nationality: string | null
  idType: string | null
  idNumber: string | null
  twoFactorEnabled: boolean
  active: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Extract the `x-user-id` header from a request.
 * Returns null if the header is missing or empty.
 */
function extractUserId(req: NextRequest): string | null {
  return req.headers.get('x-user-id')?.trim() || null
}

/**
 * Look up a user by id and strip the password field.
 * Returns null if the user does not exist.
 */
async function findUserById(id: string): Promise<SessionUser | null> {
  const user = await db.authUser.findUnique({ where: { id } })
  if (!user) return null
  const { password: _pw, ...safeUser } = user
  return safeUser as SessionUser
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Attempt to authenticate the request.
 *
 * - Reads `x-user-id` header.
 * - Validates the user exists in DB and is active.
 * - Returns the user object (without password) or `null` if unauthenticated.
 *
 * Usage in route handlers:
 *   const user = await authenticateRequest(req)
 *   if (!user) return apiUnauthorized()
 */
export async function authenticateRequest(
  req: NextRequest,
): Promise<SessionUser | null> {
  const userId = extractUserId(req)
  if (!userId) return null

  const user = await findUserById(userId)
  if (!user || !user.active) return null

  return user
}

/**
 * Require authentication — returns the user or a 401 NextResponse.
 *
 * Usage:
 *   const userOrResponse = await requireAuth(req)
 *   if (!userOrResponse) return // 401 was already returned
 *   const user = userOrResponse  // SessionUser
 */
export async function requireAuth(
  req: NextRequest,
): Promise<SessionUser | NextResponse> {
  const user = await authenticateRequest(req)
  if (!user) return apiUnauthorized()
  return user
}

/**
 * Require the authenticated user to have one of the specified roles.
 * Returns the user or a 403 NextResponse.
 *
 * Usage:
 *   const userOrResponse = await requireRole(req, 'admin', 'manager')
 *   if (!userOrResponse) return // 401 or 403 was already returned
 *   const user = userOrResponse
 *
 * If no roles are provided, behaves like `requireAuth`.
 */
export async function requireRole(
  req: NextRequest,
  ...roles: string[]
): Promise<SessionUser | NextResponse> {
  const userId = extractUserId(req)
  if (!userId) return apiUnauthorized()

  const user = await findUserById(userId)
  if (!user) return apiUnauthorized()
  if (!user.active) return apiUnauthorized('Account is deactivated')

  if (roles.length > 0 && !roles.includes(user.role)) {
    return apiForbidden(
      `Requires one of the following roles: ${roles.join(', ')}`,
    )
  }

  return user
}

/**
 * Type guard: narrow `SessionUser | NextResponse` to `SessionUser`.
 * Returns `true` when the value is a user (not a NextResponse).
 */
export function isUser(
  value: SessionUser | NextResponse,
): value is SessionUser {
  return !(value instanceof NextResponse)
}