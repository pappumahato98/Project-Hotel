import { db } from '@/lib/db'

export type SecurityEventType =
  | 'auth_success' | 'auth_failure' | 'auth_locked'
  | 'signup'
  | 'rate_limit_exceeded' | 'suspicious_request'
  | 'session_created' | 'session_destroyed' | 'session_expired'
  | 'privilege_escalation_attempt' | 'invalid_token'
  | 'password_change' | 'password_change_failure'
  | 'settings_modified' | 'data_export'
  | 'permission_denied'

export type SecurityLevel = 'info' | 'warning' | 'critical'

interface LogParams {
  type: SecurityEventType
  level?: SecurityLevel
  userId?: string
  email?: string
  ipAddress?: string
  userAgent?: string
  path?: string
  method?: string
  details?: string
}

/**
 * Fire-and-forget security audit logging.
 * Does NOT block the response — the DB write happens asynchronously.
 */
export function logSecurityEvent(params: LogParams): void {
  // Fire-and-forget — don't await, don't block the response
  db.securityEvent.create({
    data: {
      type: params.type,
      level: params.level ?? 'info',
      userId: params.userId,
      email: params.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent?.substring(0, 500),
      path: params.path,
      method: params.method,
      details: params.details?.substring(0, 2000),
    },
  }).catch(() => { /* Never let audit logging crash the app */ })
}
