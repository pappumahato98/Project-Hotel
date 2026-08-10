/**
 * Audit Trail System
 *
 * Records all user activities for compliance per IRD requirements.
 * Key requirements:
 *   - Track who did what and when
 *   - Records cannot be modified or deleted (immutable)
 *   - Includes IP address, user agent, old/new values
 *   - Uses the existing ActivityLog Prisma model
 *
 * This extends the basic ActivityLog with structured change tracking
 * for compliance-sensitive operations (financial, HR, inventory).
 */

import { db } from '@/lib/db'

// ── Types ─────────────────────────────────────────────────────────────

/** Action categories for audit logging */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'cancel'
  | 'approve'
  | 'reject'
  | 'print'
  | 'export'
  | 'login'
  | 'logout'
  | 'post'
  | 'void'
  | 'reverse'
  | 'settings_change'
  | 'role_change'
  | 'payment'
  | 'refund'

/** Document types that can be audited */
export type AuditDocType =
  | 'invoice'
  | 'journal_entry'
  | 'reservation'
  | 'employee'
  | 'leave_request'
  | 'payroll'
  | 'purchase_order'
  | 'inventory_item'
  | 'night_audit'
  | 'guest_folio'
  | 'cashier_shift'
  | 'room'
  | 'rate_plan'
  | 'system_setting'

/** Audit log entry input */
export interface AuditLogInput {
  /** User ID performing the action */
  userId: string
  /** Display name of the user */
  userName: string
  /** Action category */
  action: AuditAction
  /** Module/area of the application */
  module: string
  /** Type of document being acted upon */
  docType?: AuditDocType
  /** ID of the document */
  docId?: string
  /** IP address of the requester */
  ipAddress?: string
  /** User agent string */
  userAgent?: string
  /** Human-readable description of what happened */
  description?: string
  /** Old value(s) before change (JSON stringified) */
  oldValue?: string
  /** New value(s) after change (JSON stringified) */
  newValue?: string
  /** Additional metadata (JSON stringified) */
  metadata?: string
}

/** Audit log entry as returned from the database */
export interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  action: string
  module: string
  docType: string | null
  docId: string | null
  ipAddress: string | null
  description: string | null
  oldValue: string | null
  newValue: string | null
  metadata: string | null
  createdAt: Date
}

/** SQL query audit entry */
export interface SQLAuditEntry {
  id: string
  query: string
  userId: string | null
  module: string
  duration: number
  timestamp: Date
}

/** Filters for querying audit logs */
export interface AuditLogFilters {
  /** Filter by user ID */
  userId?: string
  /** Filter by action type */
  action?: AuditAction | AuditAction[]
  /** Filter by module */
  module?: string
  /** Filter by document type */
  docType?: AuditDocType
  /** Filter by document ID */
  docId?: string
  /** Filter from date (inclusive) */
  fromDate?: Date
  /** Filter to date (inclusive) */
  toDate?: Date
  /** Maximum number of entries to return */
  limit?: number
  /** Number of entries to skip */
  offset?: number
}

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Log an activity to the audit trail.
 *
 * Creates an immutable record in the ActivityLog table.
 * Uses fire-and-forget pattern — errors are swallowed to prevent
 * audit logging from breaking business operations.
 *
 * @param entry - Audit log input data
 */
export function logActivity(entry: AuditLogInput): void {
 const details = buildDetailsString(entry)

 db.activityLog.create({
   data: {
     userId: entry.userId,
     userName: entry.userName,
     action: `${entry.action}${entry.docType ? `:${entry.docType}` : ''}`,
     module: entry.module,
     details: details?.substring(0, 5000),
     ipAddress: entry.ipAddress?.substring(0, 45),
   },
 }).catch(() => {
   // Never let audit logging crash the application
 })
}

/**
 * Query audit log entries with optional filters.
 *
 * @param filters - Filter criteria for the query
 * @returns Array of audit log entries, newest first
 */
export async function getAuditLog(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
 const where: Record<string, unknown> = {}

 if (filters.userId) where.userId = filters.userId
 if (filters.module) where.module = filters.module
 if (filters.fromDate || filters.toDate) {
   where.createdAt = {}
   if (filters.fromDate) (where.createdAt as Record<string, Date>).gte = filters.fromDate
   if (filters.toDate) (where.createdAt as Record<string, Date>).lte = filters.toDate
 }

 // Action filter: support both single and array
 if (filters.action) {
   const actions = Array.isArray(filters.action) ? filters.action : [filters.action]
   // Match against the action:doctype pattern stored in the DB
   where.action = {
     in: actions.flatMap((a) =>
       filters.docType ? [`${a}:${filters.docType}`] : [`${a}:*`, a],
     ),
   }
 }

 if (filters.docId) {
   where.details = { contains: filters.docId }
 }

 const entries = await db.activityLog.findMany({
   where,
   orderBy: { createdAt: 'desc' },
   take: filters.limit ?? 100,
   skip: filters.offset ?? 0,
 })

 return entries.map(mapToAuditLogEntry)
}

/**
 * Get the complete audit trail for a specific document.
 *
 * Returns all audit entries related to a document (by type and ID),
 * showing the full history of changes.
 *
 * @param docType - Document type
 * @param docId - Document ID
 * @returns Array of audit log entries for the document
 */
export async function getAuditTrailForDoc(
  docType: AuditDocType,
  docId: string,
): Promise<AuditLogEntry[]> {
  const entries = await db.activityLog.findMany({
    where: {
      OR: [
        { action: { contains: `:${docType}` } },
        { action: { contains: docType } },
      ],
      details: { contains: docId },
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })

  return entries.map(mapToAuditLogEntry)
}

/**
 * Get SQL query audit logs.
 *
 * Note: Direct SQL query logging requires Prisma middleware.
 * This function provides a structured interface for when that
 * middleware is enabled.
 *
 * @returns Array of SQL audit entries
 */
export async function getSQLQueryAuditLogs(): Promise<SQLAuditEntry[]> {
  // SQL query auditing would require Prisma middleware.
  // This function returns an empty array as a placeholder.
  // When Prisma query logging middleware is added, populate this.
  return []
}

// ── Internal Helpers ──────────────────────────────────────────────────

/**
 * Build a structured details string from audit input.
 */
function buildDetailsString(entry: AuditLogInput): string {
  const parts: string[] = []

  if (entry.description) parts.push(entry.description)
  if (entry.docType) parts.push(`doc:${entry.docType}`)
  if (entry.docId) parts.push(`id:${entry.docId}`)
  if (entry.oldValue) parts.push(`old:${entry.oldValue}`)
  if (entry.newValue) parts.push(`new:${entry.newValue}`)
  if (entry.userAgent) parts.push(`ua:${entry.userAgent.substring(0, 200)}`)
  if (entry.metadata) parts.push(`meta:${entry.metadata}`)

  return parts.join(' | ')
}

/**
 * Map a Prisma ActivityLog record to an AuditLogEntry.
 */
function mapToAuditLogEntry(record: {
  id: string
  userId: string
  userName: string
  action: string
  module: string
  details: string | null
  ipAddress: string | null
  createdAt: Date
}): AuditLogEntry {
  return {
    id: record.id,
    userId: record.userId,
    userName: record.userName,
    action: record.action,
    module: record.module,
    docType: null,
    docId: null,
    ipAddress: record.ipAddress,
    description: record.details,
    oldValue: null,
    newValue: null,
    metadata: null,
    createdAt: record.createdAt,
  }
}
