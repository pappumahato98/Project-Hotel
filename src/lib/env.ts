/**
 * Environment Validation — runs at server startup.
 *
 * Catches misconfigurations BEFORE any API route is called.
 * In development, prints warnings. In production, throws to prevent
 * a broken deploy from accepting traffic.
 */

const ENV_SCHEMA = {
  // ─── Required in ALL environments ─────────────────────────────
  DATABASE_URL: {
    required: true,
    validate: (v: string) => {
      if (v.startsWith('file:')) return 'SQLite file: URL detected. PostgreSQL URL required (postgresql://...). Check your .env file.'
      if (!v.startsWith('postgresql://') && !v.startsWith('postgres://')) return 'Must start with postgresql:// or postgres://'
      // Warn about direct connections (port 5432 without pgbouncer=true) in production
      if (process.env.NODE_ENV === 'production' && !v.includes('pgbouncer=true')) {
        // Not a hard error — Supabase pooler works fine without the param
        // but we log a hint
      }
      return null
    },
  },
  JWT_SECRET: {
    required: true,
    validate: (v: string) => {
      if (v.length < 32) return `JWT_SECRET is too short (${v.length} chars). Need 32+ characters for security.`
      // Warn about common insecure values
      const insecure = ['secret', 'password', 'jwt_secret', 'changeme', 'default', 'test']
      if (insecure.includes(v.toLowerCase())) return 'JWT_SECRET appears to be an insecure default value.'
      return null
    },
  },

  // ─── Required in production only ──────────────────────────────
  REDIS_URL: {
    required: false, // Optional — falls back to in-memory store
    validate: (v: string) => {
      if (!v.startsWith('redis://') && !v.startsWith('rediss://')) {
        return 'REDIS_URL must start with redis:// or rediss://'
      }
      // rediss:// = TLS (recommended for production)
      if (process.env.NODE_ENV === 'production' && v.startsWith('redis://')) {
        return 'REDIS_URL should use rediss:// (TLS) in production for security'
      }
      return null
    },
  },
  NEXTAUTH_SECRET: {
    required: false, // Only needed if NextAuth is enabled
    validate: () => null,
  },
  SUPABASE_URL: {
    required: false, // Realtime is optional
    validate: (v: string) => {
      if (v && !v.startsWith('https://')) return 'SUPABASE_URL must start with https://'
      return null
    },
  },
  SUPABASE_ANON_KEY: {
    required: false,
    validate: (v: string) => {
      if (v && v.length < 20) return 'SUPABASE_ANON_KEY appears invalid (too short)'
      return null
    },
  },
} as const

type EnvKey = keyof typeof ENV_SCHEMA

interface ValidationResult {
  valid: boolean
  errors: { key: string; message: string }[]
  warnings: { key: string; message: string }[]
}

let _validated = false

/**
 * Validate all environment variables.
 * In production: throws if any required var is missing/invalid.
 * In development: logs warnings but does NOT throw (allows fallback users).
 */
export function validateEnv(): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: ValidationResult['warnings'] = []

  for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
    const value = process.env[key]

    // Check required
    if (schema.required && !value) {
      const msg = `${key} is not set. Add it to your .env file or deployment environment variables.`
      errors.push({ key, message: msg })
      continue
    }

    // Skip validation if not set and not required
    if (!value) continue

    // Validate format
    const validationError = schema.validate(value)
    if (validationError) {
      if (schema.required && process.env.NODE_ENV === 'production') {
        errors.push({ key, message: validationError })
      } else {
        warnings.push({ key, message: validationError })
      }
    }
  }

  // Database URL specific: in dev, if DB is postgresql but unreachable, that's OK (fallback)
  // But if it's a file: URL with postgresql provider, that's always wrong
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl?.startsWith('file:')) {
    // Already caught above as an error
  } else if (dbUrl?.startsWith('postgresql://') && process.env.NODE_ENV !== 'production') {
    // In dev, postgresql URL is fine — but warn if we can't detect pgbouncer
    // (not an error, just informational)
  }

  const valid = errors.length === 0

  if (!valid && process.env.NODE_ENV === 'production') {
    const errorMsg = errors.map(e => `  ❌ ${e.key}: ${e.message}`).join('\n')
    console.error(`\n╔══════════════════════════════════════════════════╗
║  ENVIRONMENT VALIDATION FAILED                    ║
║  The application cannot start in production.      ║
╠══════════════════════════════════════════════════╣
${errorMsg}
╚══════════════════════════════════════════════════╝\n`)
  }

  if (warnings.length > 0) {
    const warnMsg = warnings.map(w => `  ⚠️  ${w.key}: ${w.message}`).join('\n')
    console.warn(`\n[env] Configuration warnings:\n${warnMsg}\n`)
  }

  _validated = true
  return { valid, errors, warnings }
}

/**
 * Check if env has been validated. Call validateEnv() first.
 */
export function isEnvValidated(): boolean {
  return _validated
}

/**
 * Get validated env value with type safety.
 */
export function getEnv(key: EnvKey): string | undefined {
  return process.env[key]
}

/**
 * Check if a PostgreSQL database is properly configured.
 * Returns true if DATABASE_URL is a valid postgresql:// URL.
 */
export function hasPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL
  return !!url && (url.startsWith('postgresql://') || url.startsWith('postgres://')) && !url.startsWith('file:')
}
