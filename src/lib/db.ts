/**
 * Prisma Client — SQLite local development
 * For Supabase/PostgreSQL (Vercel), the connection URL is overridden by env vars.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** Retry wrapper for transient DB errors (useful for PostgreSQL/PgBouncer in production) */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (i === retries || !['42P05', '26000', '08006', '57P01', '57P02'].includes(code ?? ''))
        throw e
      await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw new Error('unreachable')
}
