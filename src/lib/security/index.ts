// Auth helpers — Supabase JWT validation
export { getAuthSession, requireAuth, requireRole, getClientIp, getClientUA } from './auth-helpers'
export type { AuthUser } from './auth-helpers'

// Rate limiting (still used by login/password endpoints)
export { loginLimiter, passwordChangeLimiter } from './rate-limiter'

// Audit logging
export { logSecurityEvent } from './audit'
