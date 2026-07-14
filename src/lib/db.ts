import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL!
  // Turso cloud URLs start with "libsql://", local dev uses "file:"
  const isTurso = url.startsWith('libsql://') || url.startsWith('https://')

  if (isTurso) {
    const libsql = createClient({ url })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['error'] })
  }

  // Local file-based SQLite (dev only)
  return new PrismaClient({ log: ['error'] })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db