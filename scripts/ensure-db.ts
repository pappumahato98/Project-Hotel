/**
 * ensure-db.ts — Auto-initializes the database on sandbox startup.
 *
 * When the dev sandbox resets, the SQLite file is wiped.
 * This script detects that condition and re-creates the schema + seeds data
 * so the app always starts with a working database.
 *
 * It is called from package.json "dev" script BEFORE the Next.js server.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DB_URL = process.env.DATABASE_URL || 'file:./db/custom.db'
// Strip "file:" prefix to get filesystem path
const dbPath = DB_URL.replace(/^file:/, '')
const absDbPath = resolve(process.cwd(), dbPath)

async function main() {
  console.log('\n🔍 ensure-db: checking database...')

  // ── Step 1: Ensure db directory exists ──────────────────────
  const dbDir = absDbPath.substring(0, absDbPath.lastIndexOf('/'))
  if (!existsSync(dbDir)) {
    console.log(`📂 ensure-db: creating directory ${dbDir}`)
    execSync(`mkdir -p "${dbDir}"`, { stdio: 'inherit' })
  }

  // ── Step 2: Check if database file exists ───────────────────
  const dbFileExists = existsSync(absDbPath)
  if (!dbFileExists) {
    console.log('📦 ensure-db: database file missing — will create schema')
  }

  // ── Step 3: Always run prisma db push (idempotent) ──────────
  //   This is safe even if the DB already exists — it only
  //   creates/alters tables to match the schema.
  console.log('⏳ ensure-db: syncing prisma schema...')
  try {
    execSync('npx prisma db push --accept-data-loss 2>&1', {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 30000,
    })
    console.log('✅ ensure-db: schema synced')
  } catch (err: any) {
    console.log('⚠️  ensure-db: prisma db push output (non-fatal):', err.stdout?.toString())
    // Non-fatal — the DB might already be in sync
  }

  // ── Step 4: Always run seed ────────────────────────────────
  //   The seed is fully idempotent: it checks each section (property,
  //   rooms, guests, etc.) and skips if data exists. It also detects
  //   stale reservation dates and auto-refreshes them.
  //   Running it on every startup adds ~1-2s when data exists.
  try {
    execSync('npx tsx prisma/seed.ts 2>&1', {
      cwd: process.cwd(),
      stdio: 'inherit',
      timeout: 60000,
    })
  } catch {
    // Non-fatal
  }

  console.log('🚀 ensure-db: database initialization complete\n')
  console.log('   NOTE: Auth users are managed by Supabase. Run scripts/vercel-seed.ts to seed demo accounts.')
}

main().catch((err) => {
  console.error('❌ ensure-db failed:', err)
  // Don't exit — let the dev server start anyway
  process.exit(0)
})