/**
 * POST /api/db-setup
 *
 * One-click database setup for production deployments.
 * 1. Runs `prisma db push` to sync the Prisma schema
 * 2. Seeds chart of accounts if the table is empty
 * 3. Verifies everything works
 *
 * Protected by JWT_SECRET (passed as "token" in request body).
 * For first-time setup (no users in DB), the token check is skipped.
 *
 * Usage:
 *   curl -X POST https://your-app.onrender.com/api/db-setup \
 *     -H "Content-Type: application/json" \
 *     -d '{"token":"your-jwt-secret"}'
 */

import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

export const maxDuration = 120

/** Chart of accounts — standard Nepali hotel chart (same as /api/accounting/setup) */
const CHART_OF_ACCOUNTS = [
  // ASSETS (1xxx)
  { code: '1000', name: 'Cash on Hand', type: 'asset', subtype: 'cash', description: 'Physical cash at front desk and cashier' },
  { code: '1010', name: 'Cash in Safe', type: 'asset', subtype: 'cash', description: 'Cash stored in hotel safe' },
  { code: '1100', name: 'Bank Account Nabil', type: 'asset', subtype: 'bank', description: 'Primary operating bank account — Nabil Bank' },
  { code: '1101', name: 'Bank Account NIC Asia', type: 'asset', subtype: 'bank', description: 'Secondary bank account — NIC Asia Bank' },
  { code: '1200', name: 'Accounts Receivable', type: 'asset', subtype: 'receivable', department: 'Front Office', description: 'Outstanding guest and city ledger balances' },
  { code: '1201', name: 'City Ledger Receivable', type: 'asset', subtype: 'receivable', description: 'Corporate account receivables' },
  { code: '1210', name: 'Credit Card Receivable', type: 'asset', subtype: 'receivable', description: 'Credit card settlements pending' },
  { code: '1220', name: 'OTA Receivables', type: 'asset', subtype: 'receivable', description: 'Online Travel Agent receivables' },
  { code: '1300', name: 'Advances to Staff', type: 'asset', subtype: 'receivable', department: 'HR', description: 'Employee salary advances' },
  { code: '1310', name: 'Prepaid Expenses', type: 'asset', subtype: 'current', description: 'Prepaid insurance, rent, subscriptions' },
  { code: '1400', name: 'Inventory — F&B', type: 'asset', subtype: 'inventory', department: 'F&B', description: 'Food and beverage stock' },
  { code: '1410', name: 'Inventory — Bar', type: 'asset', subtype: 'inventory', department: 'F&B', description: 'Bar stock and supplies' },
  { code: '1500', name: 'Furniture & Fixtures', type: 'asset', subtype: 'fixed_asset', description: 'Hotel furniture and fixtures' },
  { code: '1510', name: 'Equipment', type: 'asset', subtype: 'fixed_asset', description: 'Kitchen, laundry, and other equipment' },
  { code: '1520', name: 'Computer & IT Equipment', type: 'asset', subtype: 'fixed_asset', description: 'Computers, servers, POS terminals' },
  { code: '1600', name: 'Accumulated Depreciation', type: 'asset', subtype: 'contra_asset', description: 'Contra-asset for depreciation' },
  // LIABILITIES (2xxx)
  { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'payable', description: 'Amounts owed to vendors and suppliers' },
  { code: '2010', name: 'Accrued Expenses', type: 'liability', subtype: 'accrued', description: 'Accrued salaries, utilities, etc.' },
  { code: '2020', name: 'VAT Payable', type: 'liability', subtype: 'tax', description: 'Output VAT collected from guests' },
  { code: '2030', name: 'Income Tax Payable', type: 'liability', subtype: 'tax', description: 'TDS and corporate income tax' },
  { code: '2040', name: 'Staff Deductions Payable', type: 'liability', subtype: 'payable', department: 'HR', description: 'PF, CIT, insurance deductions' },
  { code: '2050', name: 'Advance Deposits', type: 'liability', subtype: 'advance', description: 'Guest advance deposits and prepayments' },
  { code: '2060', name: 'Deferred Revenue', type: 'liability', subtype: 'advance', description: 'Prepaid room revenue not yet earned' },
  { code: '2100', name: 'Long-term Loans', type: 'liability', subtype: 'long_term_loan', description: 'Bank loans and long-term borrowings' },
  // EQUITY (3xxx)
  { code: '3000', name: 'Owner Capital', type: 'equity', subtype: 'equity_account', description: 'Owner equity / share capital' },
  { code: '3010', name: 'Retained Earnings', type: 'equity', subtype: 'retained_earnings', description: 'Accumulated retained earnings' },
  { code: '3020', name: 'Current Year Earnings', type: 'equity', subtype: 'equity_account', description: 'Current fiscal year net income' },
  // REVENUE (4xxx)
  { code: '4000', name: 'Room Revenue', type: 'revenue', subtype: 'room', department: 'Front Office', description: 'Guest room revenue' },
  { code: '4010', name: 'Room Revenue — Corporate', type: 'revenue', subtype: 'room', department: 'Front Office', description: 'Corporate negotiated rate room revenue' },
  { code: '4020', name: 'F&B — Restaurant', type: 'revenue', subtype: 'food_beverage', department: 'F&B', description: 'Restaurant food and beverage revenue' },
  { code: '4030', name: 'F&B — Bar', type: 'revenue', subtype: 'food_beverage', department: 'F&B', description: 'Bar and lounge revenue' },
  { code: '4040', name: 'F&B — Room Service', type: 'revenue', subtype: 'food_beverage', department: 'F&B', description: 'In-room dining revenue' },
  { code: '4050', name: 'Events & Banquets', type: 'revenue', subtype: 'events', department: 'Events', description: 'Conference, wedding, and banquet revenue' },
  { code: '4060', name: 'Spa Revenue', type: 'revenue', subtype: 'spa', department: 'Spa', description: 'Spa and wellness revenue' },
  { code: '4070', name: 'Laundry Revenue', type: 'revenue', subtype: 'laundry', department: 'Laundry', description: 'Guest and commercial laundry' },
  { code: '4080', name: 'Business Center Revenue', type: 'revenue', subtype: 'other_revenue', description: 'Business center charges' },
  { code: '4090', name: 'Gift Shop Revenue', type: 'revenue', subtype: 'other_revenue', description: 'Gift shop and minibar sales' },
  { code: '4100', name: 'Other Revenue', type: 'revenue', subtype: 'other_revenue', description: 'Miscellaneous revenue' },
  { code: '4110', name: 'Commission Income', type: 'revenue', subtype: 'other_revenue', description: 'Travel agent and referral commissions' },
  { code: '4120', name: 'Interest Income', type: 'revenue', subtype: 'other_revenue', description: 'Bank interest earned' },
  // EXPENSES (5xxx)
  { code: '5000', name: 'Salaries & Wages', type: 'expense', subtype: 'payroll', department: 'HR', description: 'All staff salaries and wages' },
  { code: '5010', name: 'Overtime Pay', type: 'expense', subtype: 'payroll', department: 'HR', description: 'Overtime compensation' },
  { code: '5020', name: 'Employee Benefits', type: 'expense', subtype: 'payroll', department: 'HR', description: 'PF, insurance, meals, uniforms' },
  { code: '5030', name: 'Training Expenses', type: 'expense', subtype: 'payroll', department: 'HR', description: 'Staff training and development' },
  { code: '5100', name: 'F&B Cost of Goods Sold', type: 'expense', subtype: 'cogs', department: 'F&B', description: 'Direct cost of F&B items sold' },
  { code: '5110', name: 'Laundry Expenses', type: 'expense', subtype: 'cogs', department: 'Laundry', description: 'Laundry supplies and utilities' },
  { code: '5120', name: 'Gift Shop COGS', type: 'expense', subtype: 'cogs', description: 'Cost of gift shop items sold' },
  { code: '5200', name: 'Electricity', type: 'expense', subtype: 'utilities', description: 'Electricity charges' },
  { code: '5201', name: 'Water', type: 'expense', subtype: 'utilities', description: 'Water and sewer charges' },
  { code: '5202', name: 'Internet & Telephone', type: 'expense', subtype: 'utilities', description: 'Internet and telecom charges' },
  { code: '5210', name: 'Gas / LPG', type: 'expense', subtype: 'utilities', description: 'Cooking gas and heating fuel' },
  { code: '5300', name: 'Repairs & Maintenance', type: 'expense', subtype: 'maintenance', description: 'Building and equipment maintenance' },
  { code: '5310', name: 'Cleaning Supplies', type: 'expense', subtype: 'maintenance', department: 'Housekeeping', description: 'Housekeeping cleaning materials' },
  { code: '5400', name: 'Marketing & Sales', type: 'expense', subtype: 'marketing', description: 'Advertising, OTA commissions, promotions' },
  { code: '5410', name: 'OTA Commissions', type: 'expense', subtype: 'marketing', description: 'Online Travel Agent commissions' },
  { code: '5500', name: 'Depreciation', type: 'expense', subtype: 'depreciation', description: 'Depreciation on fixed assets' },
  { code: '5600', name: 'Insurance', type: 'expense', subtype: 'insurance', description: 'Property, liability, and other insurance' },
  { code: '5700', name: 'Office Supplies', type: 'expense', subtype: 'admin', description: 'General office supplies and printing' },
  { code: '5800', name: 'Professional Fees', type: 'expense', subtype: 'admin', description: 'Legal, audit, and consulting fees' },
  { code: '5900', name: 'Travel & Entertainment', type: 'expense', subtype: 'admin', description: 'Staff travel and business entertainment' },
] as const

// Type assertion for Prisma createMany (readonly arrays aren't compatible)
const CHART_OF_ACCOUNTS_DATA = CHART_OF_ACCOUNTS as unknown as Array<{ code: string; name: string; type: string; subtype: string; description: string; department?: string }>

export async function POST(req: NextRequest) {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(`[db-setup] ${msg}`)
    logs.push(msg)
  }

  try {
    // ── Token verification ──
    const body = await req.json().catch(() => ({}))
    const providedToken = String(body.token || '')
    const expectedToken = process.env.JWT_SECRET || ''

    if (!expectedToken) {
      return NextResponse.json({
        error: 'JWT_SECRET not configured on server',
        hint: 'Set the JWT_SECRET environment variable in your deployment platform.',
      }, { status: 500 })
    }

    // For fresh databases (no users), allow without token
    let skipTokenCheck = false
    if (!providedToken) {
      try {
        const { db } = await import('@/lib/db')
        const userCount = await db.authUser.count()
        if (userCount === 0) {
          skipTokenCheck = true
          log('No users in database — skipping token check for initial setup')
        }
      } catch {
        skipTokenCheck = true
        log('Cannot query database — assuming fresh setup')
      }
    }

    if (!skipTokenCheck && providedToken !== expectedToken) {
      return NextResponse.json({
        error: 'Invalid or missing setup token',
        hint: 'Pass your JWT_SECRET as the "token" field in the request body.',
      }, { status: 401 })
    }

    // ── Step 1: Push schema to database ──
    log('Step 1/4: Syncing schema (prisma db push)...')
    try {
      const pushOutput = execSync('npx prisma db push --accept-data-loss 2>&1', {
        timeout: 90_000,
        encoding: 'utf-8',
        env: { ...process.env },
      })
      log('Schema push completed')
      if (pushOutput) log(pushOutput.trim().substring(0, 500))
    } catch (err: unknown) {
      const execErr = err as { stderr?: string; stdout?: string; message?: string }
      const stderr = execErr.stderr || execErr.stdout || execErr.message || String(err)
      log(`Schema push output: ${stderr.substring(0, 500)}`)
      if (stderr.includes('already in sync') || stderr.includes('Everything is already')) {
        log('Schema is already up to date')
      } else {
        return NextResponse.json({
          error: 'Schema push failed',
          detail: stderr.substring(0, 1000),
          logs,
        }, { status: 500 })
      }
    }

    // ── Step 2: Regenerate Prisma client ──
    log('Step 2/4: Regenerating Prisma client...')
    try {
      execSync('npx prisma generate 2>&1', {
        timeout: 30_000,
        encoding: 'utf-8',
      })
      log('Prisma client regenerated')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`Prisma generate note: ${msg.substring(0, 200)}`)
    }

    // ── Step 3: Seed chart of accounts if empty ──
    log('Step 3/4: Checking chart of accounts...')
    let accountsSeeded = 0
    try {
      const { db } = await import('@/lib/db')
      const existingAccounts = await db.ledgerAccount.count()
      log(`Found ${existingAccounts} existing accounts`)

      if (existingAccounts === 0) {
        log('Seeding chart of accounts (50 accounts)...')
        const result = await db.ledgerAccount.createMany({
          data: CHART_OF_ACCOUNTS_DATA,
          skipDuplicates: true,
        })
        accountsSeeded = result.count
        log(`Seeded ${accountsSeeded} chart of accounts`)
      } else {
        log('Chart of accounts already exists — skipping seed')
        accountsSeeded = existingAccounts
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`Account seed error: ${msg.substring(0, 300)}`)
      // Don't fail — schema might still be syncing
    }

    // ── Step 4: Create initial accounting period if missing ──
    log('Step 4/5: Checking accounting periods...')
    try {
      const { db } = await import('@/lib/db')
      const periodCount = await db.accountingPeriod.count()
      if (periodCount === 0) {
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() // 0-indexed
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

        // Create current period as open
        await db.accountingPeriod.create({
          data: {
            period: `${monthNames[month]} ${year}`,
            periodType: 'month',
            startDate: new Date(year, month, 1),
            endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
            status: 'open',
          },
        })
        log(`Created accounting period: ${monthNames[month]} ${year}`)
      } else {
        log(`Found ${periodCount} existing accounting periods`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`Period check note: ${msg.substring(0, 200)}`)
    }

    // ── Step 5: Seed/reset default users ──
    log('Step 5/5: Checking default users...')
    let usersSeeded = 0
    let usersUpdated = 0
    try {
      const { db } = await import('@/lib/db')
      const { hash } = await import('bcryptjs')
      const userCount = await db.authUser.count()
      log(`Found ${userCount} existing users`)

      const defaultUsers = [
        { id: 'admin-001', email: 'admin@meridian.com', password: 'admin123', firstName: 'Rajesh', lastName: 'Sharma', role: 'admin', department: 'Management', position: 'General Manager' },
        { id: 'gm-001', email: 'gm@meridian.com', password: 'gm123', firstName: 'Sita', lastName: 'Adhikari', role: 'gm', department: 'Management', position: 'General Manager' },
        { id: 'staff-001', email: 'staff@meridian.com', password: 'staff123', firstName: 'Hari', lastName: 'Thapa', role: 'staff', department: 'Front Office', position: 'Receptionist' },
      ]

      for (const u of defaultUsers) {
        const passwordHash = await hash(u.password, 10)
        const existing = await db.authUser.findUnique({ where: { email: u.email } }).catch(() => null)
        if (!existing) {
          await db.authUser.create({ data: { ...u, passwordHash, active: true } })
          usersSeeded++
          log(`Created user: ${u.email} (${u.role})`)
        } else {
          // Always update password + role to ensure defaults are correct
          await db.authUser.update({
            where: { email: u.email },
            data: { passwordHash, role: u.role, active: true, firstName: u.firstName, lastName: u.lastName, department: u.department, position: u.position },
          })
          usersUpdated++
          log(`Updated user: ${u.email} (${u.role})`)
        }
      }
      log(`Seeded ${usersSeeded} new, updated ${usersUpdated} existing users`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`User seed note: ${msg.substring(0, 200)}`)
    }

    return NextResponse.json({
      success: true,
      message: `Setup complete: schema synced, ${accountsSeeded} chart of accounts, ${usersSeeded} created, ${usersUpdated} updated`,
      steps: ['schema-push', 'prisma-generate', 'seed-accounts', 'check-periods', 'seed-users'],
      accountsSeeded,
      usersSeeded,
      usersUpdated,
      logs,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[db-setup] Fatal error:', msg)
    return NextResponse.json({
      error: 'Database setup failed',
      detail: msg.substring(0, 500),
      logs,
    }, { status: 500 })
  }
}

/**
 * GET /api/db-setup
 * Returns database setup status without making changes.
 */
export async function GET() {
  try {
    const { db } = await import('@/lib/db')

    let userCount = 0
    let accountCount = 0
    let periodCount = 0
    let dbConnected = false
    let schemaError = ''

    try {
      userCount = await db.authUser.count()
      dbConnected = true
    } catch (e: unknown) {
      dbConnected = false
      const msg = e instanceof Error ? e.message : 'Connection failed'
      schemaError = msg.substring(0, 200)
    }

    try {
      accountCount = await db.ledgerAccount.count()
    } catch (e: unknown) {
      accountCount = -1
      const msg = e instanceof Error ? e.message : 'LedgerAccount query failed'
      schemaError = msg.substring(0, 300)
    }

    try {
      periodCount = await db.accountingPeriod.count()
    } catch {
      periodCount = -1
    }

    return NextResponse.json({
      status: dbConnected ? 'connected' : 'disconnected',
      users: userCount,
      ledgerAccounts: accountCount,
      accountingPeriods: periodCount,
      needsSetup: !dbConnected || accountCount <= 0,
      schemaError: schemaError || undefined,
      hint: !dbConnected
        ? 'Database connection failed. Check DATABASE_URL.'
        : accountCount === -1
          ? 'Schema out of date. POST /api/db-setup to sync.'
          : accountCount === 0
            ? 'No chart of accounts. POST /api/db-setup to seed.'
            : 'Database is ready.',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      status: 'error',
      error: msg.substring(0, 500),
      needsSetup: true,
    }, { status: 500 })
  }
}
