/**
 * Standardized API response helpers.
 *
 * Every API route should use these to ensure a consistent response shape:
 *   Success → { success: true, data, ...meta }
 *   Error   → { success: false, error: string, details? }
 */

import { NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────

interface ApiSuccessEnvelope<T = unknown> {
  success: true
  data: T
  [key: string]: unknown
}

interface ApiErrorEnvelope {
  success: false
  error: string
  details?: unknown
}

interface ValidationError {
  field: string
  message: string
}

interface ApiValidationEnvelope {
  success: false
  error: 'Validation failed'
  errors: ValidationError[]
}

export type { ValidationError }

// ─── Success ────────────────────────────────────────────────────

/**
 * Return a successful JSON response.
 *
 * @param data   — The response payload.
 * @param status — HTTP status (default 200).
 * @param meta   — Extra top-level keys merged into the envelope (e.g. { total, page }).
 */
export function apiSuccess<T = unknown>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>,
) {
  const envelope: ApiSuccessEnvelope<T> & Record<string, unknown> = {
    success: true as const,
    data,
    ...meta,
  }
  return NextResponse.json(envelope, { status })
}

// ─── Generic Error ──────────────────────────────────────────────

/**
 * Return an error JSON response with the given HTTP status.
 */
export function apiError(
  message: string,
  status: number = 500,
  details?: unknown,
) {
  const envelope: ApiErrorEnvelope = {
    success: false as const,
    error: message,
    ...(details !== undefined && { details }),
  }
  return NextResponse.json(envelope, { status })
}

// ─── HTTP 400 ──────────────────────────────────────────────────

export function apiBadRequest(
  message: string = 'Bad request',
  details?: unknown,
) {
  return apiError(message, 400, details)
}

// ─── HTTP 401 ──────────────────────────────────────────────────

export function apiUnauthorized(message: string = 'Authentication required') {
  return apiError(message, 401)
}

// ─── HTTP 403 ──────────────────────────────────────────────────

export function apiForbidden(message: string = 'Insufficient permissions') {
  return apiError(message, 403)
}

// ─── HTTP 404 ──────────────────────────────────────────────────

export function apiNotFound(message: string = 'Resource not found') {
  return apiError(message, 404)
}

// ─── HTTP 409 ──────────────────────────────────────────────────

export function apiConflict(
  message: string = 'Resource conflict',
  details?: unknown,
) {
  return apiError(message, 409, details)
}

// ─── HTTP 422 — Validation ────────────────────────────────────

/**
 * Return a 422 response with per-field validation errors.
 *
 * @param errors — Array of { field, message } objects.
 */
export function apiValidationError(errors: ValidationError[]) {
  const envelope: ApiValidationEnvelope = {
    success: false,
    error: 'Validation failed',
    errors,
  }
  return NextResponse.json(envelope, { status: 422 })
}

// ─── Validation helper ─────────────────────────────────────────

/**
 * Collect validation errors for required/optional string fields.
 * Returns the error array (empty = all valid).
 *
 * Usage:
 *   const errors = validateFields(body, {
 *     email:    { required: true, label: 'Email' },
 *     phone:    { required: false },
 *   })
 *   if (errors.length) return apiValidationError(errors)
 */
export function validateFields(
  data: Record<string, unknown>,
  rules: Record<string, { required?: boolean; label?: string; minLength?: number }>,
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [field, rule] of Object.entries(rules)) {
    const label = rule.label || field
    const value = data[field]

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${label} is required` })
    } else if (typeof value === 'string' && rule.minLength && value.length < rule.minLength) {
      errors.push({ field, message: `${label} must be at least ${rule.minLength} characters` })
    }
  }

  return errors
}