/**
 * apply-rls.ts — Apply Row Level Security policies to Supabase Postgres.
 *
 * Uses Prisma's $executeRawUnsafe to run the DDL statements from
 * supabase/rls-policies.sql against the Postgres database.
 *
 * Run: bunx tsx scripts/apply-rls.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

async function main() {
  const db = new PrismaClient({ log: ['error'] })

  try {
    const sqlPath = resolve(process.cwd(), 'supabase/rls-policies.sql')
    const rawSql = readFileSync(sqlPath, 'utf-8')

    // Strip SQL line comments (-- ...) before splitting, so semicolons
    // inside comments don't get treated as statement separators.
    const sql = rawSql
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('--')
        return idx >= 0 ? line.substring(0, idx) : line
      })
      .join('\n')

    // Split SQL into statements, respecting $$ dollar-quote blocks.
    const statements: string[] = []
    let current = ''
    let inDollarQuote = false

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i]
      current += char

      // Detect $$ toggle (check for the two-char sequence)
      if (char === '$' && sql[i + 1] === '$') {
        inDollarQuote = !inDollarQuote
        current += '$'
        i++
        continue
      }

      // Split on semicolon only when NOT inside a $$ block
      if (char === ';' && !inDollarQuote) {
        const trimmed = current.trim()
        if (trimmed) statements.push(trimmed)
        current = ''
      }
    }
    if (current.trim()) statements.push(current.trim())

    console.log(`📝 Applying ${statements.length} RLS statements to Supabase Postgres...`)
    console.log('')

    let success = 0
    let skipped = 0
    for (const stmt of statements) {
      if (!stmt || stmt.startsWith('--')) {
        skipped++
        continue
      }
      try {
        await db.$executeRawUnsafe(stmt)
        const preview = stmt.replace(/\n/g, ' ').substring(0, 80)
        console.log(`  ✅ ${preview}...`)
        success++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // "already exists" is OK — policy was created in a previous run
        if (msg.includes('already exists')) {
          console.log(`  ⏭️  (already exists) ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`)
          skipped++
        } else {
          console.error(`  ❌ ${msg.substring(0, 100)}`)
          console.error(`     SQL: ${stmt.substring(0, 120).replace(/\n/g, ' ')}...`)
        }
      }
    }

    console.log('')
    console.log(`🎉 RLS policies applied: ${success} created, ${skipped} skipped`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err?.message || err)
  process.exit(1)
})
