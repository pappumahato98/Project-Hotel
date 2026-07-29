import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Automatically append pgbouncer=true for Supabase transaction pooler.
 * PgBouncer (port 6543) does not support prepared statements, which Prisma
 * uses by default. This flag tells Prisma to avoid them.
 */
function getPgBouncerUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url || url.includes('pgbouncer=true')) return url
  return `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: { url: getPgBouncerUrl() },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
