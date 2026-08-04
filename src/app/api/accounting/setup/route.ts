import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export const maxDuration = 60

/**
 * POST /api/accounting/setup
 *
 * Initializes accounting tables by seeding the chart of accounts.
 * Idempotent — skips if accounts already exist.
 * This is a lightweight alternative to the full /api/seed for accounting setup.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'gm', 'manager'])
  if (auth instanceof NextResponse) return auth

  try {
    const existing = await db.ledgerAccount.count()
    if (existing > 0) {
      return NextResponse.json({ message: `Accounting already initialized (${existing} accounts exist)`, count: existing })
    }

    const accounts = [
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
    ]

    const created = await db.ledgerAccount.createMany({ data: accounts, skipDuplicates: true })
    afterMutation('accounting')

    return NextResponse.json({
      message: `Accounting initialized with ${created.count} chart of accounts`,
      count: created.count,
    }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('relation') && (msg.includes('does not exist') || msg.includes('not found'))) {
      return NextResponse.json({
        error: 'Accounting tables not found in database',
        detail: msg,
        hint: 'Run "npx prisma db push" locally or redeploy to sync the schema.',
      }, { status: 503 })
    }
    console.error('Accounting setup error:', msg)
    return NextResponse.json({ error: 'Failed to initialize accounting', detail: msg.substring(0, 200) }, { status: 500 })
  }
}
