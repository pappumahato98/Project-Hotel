/**
 * Shared auto-posting engine for hospitality ERP.
 *
 * This module is called FROM other API routes (folio, POS, payroll, events, night audit)
 * to automatically create journal entries when business transactions occur.
 *
 * All entries are created in 'posted' status (auto-posted).
 * Errors are logged but never block the source transaction (fire-and-forget with logging).
 */

import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'

// ─── Account Code Constants ─────────────────────────────────────
const ACCT = {
  CASH: '1000',
  CASH_SAFE: '1010',
  BANK_NABIL: '1100',
  BANK_NIC_ASIA: '1101',
  ACCOUNTS_RECEIVABLE: '1200',
  CITY_LEDGER_RECEIVABLE: '1201',
  CARD_RECEIVABLE: '1210',
  OTA_RECEIVABLE: '1220',
  ACCOUNTS_PAYABLE: '2000',
  VAT_PAYABLE: '2020',
  INCOME_TAX_PAYABLE: '2030',
  ADVANCE_DEPOSITS: '2050',
  DEFERRED_REVENUE: '2060',
  OWNER_CAPITAL: '3000',
  RETAINED_EARNINGS: '3010',
  ROOM_REVENUE: '4000',
  ROOM_REVENUE_CORPORATE: '4010',
  FB_RESTAURANT: '4020',
  FB_BAR: '4030',
  FB_ROOM_SERVICE: '4040',
  EVENTS_REVENUE: '4050',
  SPA_REVENUE: '4060',
  LAUNDRY_REVENUE: '4070',
  BUSINESS_CENTER_REVENUE: '4080',
  GIFT_SHOP_REVENUE: '4090',
  OTHER_REVENUE: '4100',
  COMMISSION_INCOME: '4110',
  INTEREST_INCOME: '4120',
  SALARY_WAGES: '5000',
  OVERTIME_PAY: '5010',
  EMPLOYEE_BENEFITS: '5020',
  TRAINING_EXPENSES: '5030',
  FB_COGS: '5100',
  LAUNDRY_EXPENSES: '5110',
  GIFT_SHOP_COGS: '5120',
  UTILITIES_ELECTRICITY: '5200',
  UTILITIES_WATER: '5201',
  UTILITIES_INTERNET: '5202',
  UTILITIES_GAS: '5203',
  REPAIRS_MAINTENANCE: '5300',
  HK_SUPPLIES_EXPENSE: '5310',
  MARKETING_ADVERTISING: '5400',
  DEPRECIATION_EXPENSE: '5500',
  INSURANCE_EXPENSE: '5600',
  OFFICE_PRINTING: '5700',
  TRAVEL_ENTERTAINMENT: '5800',
  BANK_CHARGES: '5900',
  MISCELLANEOUS_EXPENSE: '5999',
  INCOME_SUMMARY: '3900', // virtual account for period close
} as const

interface JournalLineInput {
  accountId: string
  debit: number
  credit: number
  narration?: string
}

async function findAccountByCode(code: string) {
  return db.ledgerAccount.findUnique({ where: { code } })
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Create a journal entry directly (not via HTTP). Fire-and-forget with error logging.
 */
async function createJournalEntry(params: {
  date?: Date
  description: string
  reference?: string | null
  sourceModule: string
  sourceId?: string | null
  createdBy: string
  lines: JournalLineInput[]
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const { lines, ...rest } = params

    // Validate accounts exist and are active
    const accountIds = [...new Set(lines.map(l => l.accountId))]
    const accounts = await db.ledgerAccount.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, active: true },
    })
    const accountMap = new Map(accounts.map(a => [a.id, a.active]))
    for (const aid of accountIds) {
      if (!accountMap.has(aid)) {
        console.warn(`[AutoPost] Account ${aid} not found, skipping entry: ${rest.description}`)
        return { success: false, error: `Account ${aid} not found` }
      }
      if (!accountMap.get(aid)) {
        console.warn(`[AutoPost] Account ${aid} is inactive, skipping entry: ${rest.description}`)
        return { success: false, error: `Account ${aid} is inactive` }
      }
    }

    // Validate balance (tolerance 0.01)
    const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0))
    const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0))
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.warn(`[AutoPost] Unbalanced entry: DR=${totalDebit} CR=${totalCredit} — ${rest.description}`)
      return { success: false, error: `Unbalanced: DR=${totalDebit} CR=${totalCredit}` }
    }

    const entry = await db.journalEntry.create({
      data: {
        date: params.date || new Date(),
        description: rest.description,
        reference: rest.reference || null,
        status: 'posted',
        sourceModule: rest.sourceModule,
        sourceId: rest.sourceId || null,
        createdBy: rest.createdBy,
        postedBy: rest.createdBy,
        postedAt: new Date(),
        lines: { create: lines },
      },
    })

    afterMutation('accounting')
    broadcastEvent('journal_entry:auto_posted', {
      module: rest.sourceModule,
      entryId: entry.id,
    })

    return { success: true, entryId: entry.id }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[AutoPost] Failed to create entry: ${msg}`)
    return { success: false, error: msg }
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API — one function per source module
// ═══════════════════════════════════════════════════════════════

/**
 * Auto-post a room revenue charge from folio transaction.
 * Called when a FolioTransaction with type='room' is created.
 */
export async function postRoomRevenue(params: {
  folioId: string
  reservationId?: string
  guestName: string
  amount: number
  taxAmount: number
  description?: string
  postedBy: string
}): Promise<void> {
  const { folioId, reservationId, guestName, amount, taxAmount, description, postedBy } = params
  const netAmount = round2(amount)
  const tax = round2(taxAmount)
  const total = round2(netAmount + tax)

  try {
    const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)
    const revAcct = await findAccountByCode(ACCT.ROOM_REVENUE)
    const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

    if (!arAcct || !revAcct) {
      console.warn('[AutoPost] Missing AR or Room Revenue accounts, skipping room revenue post')
      return
    }

    const lines: JournalLineInput[] = [
      { accountId: arAcct.id, debit: total, credit: 0, narration: `Room charge — ${guestName}` },
      { accountId: revAcct.id, debit: 0, credit: netAmount, narration: description || `Room revenue — ${guestName}` },
    ]
    if (tax > 0 && vatAcct) {
      lines.push({ accountId: vatAcct.id, debit: 0, credit: tax, narration: 'VAT on room revenue' })
    }

    await createJournalEntry({
      description: `Room Revenue — ${guestName}`,
      reference: `FOLIO-${folioId.slice(0, 8)}`,
      sourceModule: 'front_desk',
      sourceId: folioId,
      createdBy: postedBy,
      lines,
    })
  } catch (error) {
    console.error('[AutoPost] postRoomRevenue error:', error)
  }
}

/**
 * Auto-post F&B or other outlet charge to folio.
 * Called when a FolioTransaction with type in ['f_and_b', 'laundry', 'spa', 'phone', 'minibar', 'business_center', 'miscellaneous'] is created.
 */
export async function postFolioCharge(params: {
  folioId: string
  guestName: string
  transactionType: string
  amount: number
  taxAmount: number
  description?: string
  outlet?: string | null
  postedBy: string
}): Promise<void> {
  const { folioId, guestName, transactionType, amount, taxAmount, description, outlet, postedBy } = params
  const netAmount = round2(amount)
  const tax = round2(taxAmount)
  const total = round2(netAmount + tax)

  try {
    // Map transaction type to revenue account code
    let revenueCode = ACCT.OTHER_REVENUE
    if (transactionType === 'f_and_b') {
      // Try to determine specific F&B account based on outlet
      const outletLower = (outlet || '').toLowerCase()
      if (outletLower.includes('bar') || outletLower.includes('lounge')) revenueCode = ACCT.FB_BAR
      else if (outletLower.includes('room service') || outletLower.includes('in-room')) revenueCode = ACCT.FB_ROOM_SERVICE
      else revenueCode = ACCT.FB_RESTAURANT
    } else if (transactionType === 'laundry') revenueCode = ACCT.LAUNDRY_REVENUE
    else if (transactionType === 'spa') revenueCode = ACCT.SPA_REVENUE
    else if (transactionType === 'business_center') revenueCode = ACCT.BUSINESS_CENTER_REVENUE

    const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)
    const revAcct = await findAccountByCode(revenueCode)
    const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

    if (!arAcct || !revAcct) {
      console.warn(`[AutoPost] Missing accounts for ${transactionType}, skipping`)
      return
    }

    const lines: JournalLineInput[] = [
      { accountId: arAcct.id, debit: total, credit: 0, narration: `${transactionType} — ${guestName}` },
      { accountId: revAcct.id, debit: 0, credit: netAmount, narration: description || `${transactionType} revenue — ${guestName}` },
    ]
    if (tax > 0 && vatAcct) {
      lines.push({ accountId: vatAcct.id, debit: 0, credit: tax, narration: `VAT on ${transactionType}` })
    }

    await createJournalEntry({
      description: `${transactionType} — ${guestName}`,
      reference: `FOLIO-${folioId.slice(0, 8)}`,
      sourceModule: 'front_desk',
      sourceId: folioId,
      createdBy: postedBy,
      lines,
    })
  } catch (error) {
    console.error('[AutoPost] postFolioCharge error:', error)
  }
}

/**
 * Auto-post folio settlement (checkout payment).
 * DR Cash/Bank, CR Accounts Receivable.
 */
export async function postFolioSettlement(params: {
  folioId: string
  guestName: string
  paymentMethod: string
  amount: number
  postedBy: string
}): Promise<void> {
  const { folioId, guestName, paymentMethod, amount, postedBy } = params
  const total = round2(amount)
  if (total <= 0) return

  try {
    // Determine debit account based on payment method
    let debitAccountCode = ACCT.CASH
    if (['visa', 'mastercard', 'amex'].includes(paymentMethod.toLowerCase())) {
      debitAccountCode = ACCT.CARD_RECEIVABLE
    } else if (paymentMethod === 'bank_transfer') {
      debitAccountCode = ACCT.BANK_NABIL
    } else if (paymentMethod === 'city_ledger') {
      debitAccountCode = ACCT.CITY_LEDGER_RECEIVABLE
    }

    const debitAcct = await findAccountByCode(debitAccountCode)
    const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)

    if (!debitAcct || !arAcct) {
      console.warn('[AutoPost] Missing accounts for folio settlement, skipping')
      return
    }

    await createJournalEntry({
      description: `Folio Settlement — ${guestName} (${paymentMethod})`,
      reference: `FOLIO-SETTLE-${folioId.slice(0, 8)}`,
      sourceModule: 'front_desk',
      sourceId: folioId,
      createdBy: postedBy,
      lines: [
        { accountId: debitAcct.id, debit: total, credit: 0, narration: `Payment received — ${guestName} via ${paymentMethod}` },
        { accountId: arAcct.id, debit: 0, credit: total, narration: `AR settlement — ${guestName}` },
      ],
    })
  } catch (error) {
    console.error('[AutoPost] postFolioSettlement error:', error)
  }
}

/**
 * Auto-post POS revenue when order is closed/paid.
 */
export async function postPosRevenue(params: {
  orderId: string
  outletName: string
  outletCode?: string
  amount: number
  taxAmount: number
  postedBy: string
}): Promise<void> {
  const { orderId, outletName, outletCode, amount, taxAmount, postedBy } = params
  const netAmount = round2(amount)
  const tax = round2(taxAmount)
  const total = round2(netAmount + tax)

  try {
    // Determine revenue account based on outlet code
    let revenueCode = ACCT.FB_RESTAURANT
    const code = (outletCode || outletName || '').toLowerCase()
    if (code.includes('bar') || code.includes('lounge')) revenueCode = ACCT.FB_BAR
    else if (code.includes('spa')) revenueCode = ACCT.SPA_REVENUE
    else if (code.includes('laundry')) revenueCode = ACCT.LAUNDRY_REVENUE
    else if (code.includes('business') || code.includes('bc')) revenueCode = ACCT.BUSINESS_CENTER_REVENUE
    else if (code.includes('gift') || code.includes('shop')) revenueCode = ACCT.GIFT_SHOP_REVENUE

    const cashAcct = await findAccountByCode(ACCT.CASH)
    const revAcct = await findAccountByCode(revenueCode)
    const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

    if (!cashAcct || !revAcct) {
      console.warn('[AutoPost] Missing accounts for POS revenue, skipping')
      return
    }

    const lines: JournalLineInput[] = [
      { accountId: cashAcct.id, debit: total, credit: 0, narration: `F&B sale — ${outletName}` },
      { accountId: revAcct.id, debit: 0, credit: netAmount, narration: `F&B revenue — ${outletName}` },
    ]
    if (tax > 0 && vatAcct) {
      lines.push({ accountId: vatAcct.id, debit: 0, credit: tax, narration: `VAT on F&B — ${outletName}` })
    }

    await createJournalEntry({
      description: `POS Revenue — ${outletName}`,
      reference: `POS-${orderId.slice(0, 8)}`,
      sourceModule: 'pos',
      sourceId: orderId,
      createdBy: postedBy,
      lines,
    })
  } catch (error) {
    console.error('[AutoPost] postPosRevenue error:', error)
  }
}

/**
 * Auto-post payroll when payroll is processed.
 * DR Salary & Wages, DR Overtime, CR Cash/Bank, CR Tax Payable.
 */
export async function postPayroll(params: {
  employeeName: string
  department: string
  grossPay: number
  deductions: number
  netPay: number
  month: string
  postedBy: string
}): Promise<void> {
  const { employeeName, department, grossPay, deductions, netPay, month, postedBy } = params
  const gross = round2(grossPay)
  const deduct = round2(deductions)
  const net = round2(netPay)

  try {
    const salaryAcct = await findAccountByCode(ACCT.SALARY_WAGES)
    const cashAcct = await findAccountByCode(ACCT.BANK_NABIL)
    const taxAcct = await findAccountByCode(ACCT.INCOME_TAX_PAYABLE)

    if (!salaryAcct || !cashAcct) {
      console.warn('[AutoPost] Missing salary or bank accounts, skipping payroll post')
      return
    }

    const lines: JournalLineInput[] = [
      { accountId: salaryAcct.id, debit: gross, credit: 0, narration: `Salary — ${employeeName} (${month})` },
      { accountId: cashAcct.id, debit: 0, credit: net, narration: `Net pay — ${employeeName}` },
    ]
    if (deduct > 0 && taxAcct) {
      lines.push({ accountId: taxAcct.id, debit: 0, credit: deduct, narration: `Tax deductions — ${employeeName}` })
    } else if (deduct > 0 && !taxAcct) {
      // No tax account, credit cash for full gross
      lines[1] = { ...lines[1], credit: gross }
    }

    await createJournalEntry({
      description: `Payroll — ${employeeName} (${month})`,
      reference: `PAYROLL-${month}`,
      sourceModule: 'payroll',
      createdBy: postedBy,
      lines,
    })
  } catch (error) {
    console.error('[AutoPost] postPayroll error:', error)
  }
}

/**
 * Auto-post night audit revenue summary.
 */
export async function postNightAuditSummary(params: {
  roomRevenue: number
  fbRevenue: number
  otherRevenue: number
  taxCollected: number
  businessDate?: string
  postedBy: string
}): Promise<void> {
  const { roomRevenue, fbRevenue, otherRevenue, taxCollected, businessDate, postedBy } = params
  const room = round2(roomRevenue)
  const fb = round2(fbRevenue)
  const other = round2(otherRevenue)
  const tax = round2(taxCollected)
  const totalRevenue = round2(room + fb + other)

  if (totalRevenue === 0 && tax === 0) return

  try {
    const cashAcct = await findAccountByCode(ACCT.CASH)
    const roomAcct = await findAccountByCode(ACCT.ROOM_REVENUE)
    const fbAcct = await findAccountByCode(ACCT.FB_RESTAURANT)
    const otherAcct = await findAccountByCode(ACCT.OTHER_REVENUE)
    const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

    if (!cashAcct || !roomAcct) {
      console.warn('[AutoPost] Missing accounts for night audit, skipping')
      return
    }

    const lines: JournalLineInput[] = [
      { accountId: cashAcct.id, debit: totalRevenue + tax, credit: 0, narration: 'Night audit — total daily revenue' },
    ]
    if (room > 0) lines.push({ accountId: roomAcct.id, debit: 0, credit: room, narration: 'Night audit — room revenue' })
    if (fb > 0 && fbAcct) lines.push({ accountId: fbAcct.id, debit: 0, credit: fb, narration: 'Night audit — F&B revenue' })
    if (other > 0 && otherAcct) lines.push({ accountId: otherAcct.id, debit: 0, credit: other, narration: 'Night audit — other revenue' })
    if (tax > 0 && vatAcct) lines.push({ accountId: vatAcct.id, debit: 0, credit: tax, narration: 'Night audit — VAT collected' })

    const dateStr = businessDate || new Date().toISOString().slice(0, 10)
    await createJournalEntry({
      description: `Night Audit Summary — ${dateStr}`,
      reference: `NA-${dateStr}`,
      sourceModule: 'night_audit',
      createdBy: postedBy,
      lines,
    })
  } catch (error) {
    console.error('[AutoPost] postNightAuditSummary error:', error)
  }
}

/**
 * Auto-post events/banquet revenue.
 */
export async function postEventsRevenue(params: {
  eventId: string
  eventName: string
  amount: number
  taxAmount: number
  postedBy: string
}): Promise<void> {
  const { eventId, eventName, amount, taxAmount, postedBy } = params
  const netAmount = round2(amount)
  const tax = round2(taxAmount)
  const total = round2(netAmount + tax)

  try {
    const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)
    const eventsAcct = await findAccountByCode(ACCT.EVENTS_REVENUE)
    const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

    if (!arAcct || !eventsAcct) {
      console.warn('[AutoPost] Missing accounts for events revenue, skipping')
      return
    }

    const lines: JournalLineInput[] = [
      { accountId: arAcct.id, debit: total, credit: 0, narration: `Event — ${eventName}` },
      { accountId: eventsAcct.id, debit: 0, credit: netAmount, narration: `Events revenue — ${eventName}` },
    ]
    if (tax > 0 && vatAcct) {
      lines.push({ accountId: vatAcct.id, debit: 0, credit: tax, narration: `VAT on events — ${eventName}` })
    }

    await createJournalEntry({
      description: `Events Revenue — ${eventName}`,
      reference: `EVENT-${eventId.slice(0, 8)}`,
      sourceModule: 'events',
      sourceId: eventId,
      createdBy: postedBy,
      lines,
    })
  } catch (error) {
    console.error('[AutoPost] postEventsRevenue error:', error)
  }
}

/**
 * Auto-post purchase order delivery (inventory purchase).
 * DR Inventory/F&B COGS, CR Accounts Payable.
 */
export async function postPurchaseOrder(params: {
  poId: string
  poNumber: string
  vendorName: string
  totalAmount: number
  postedBy: string
}): Promise<void> {
  const { poId, poNumber, vendorName, totalAmount, postedBy } = params
  const total = round2(totalAmount)

  try {
    const invAcct = await findAccountByCode(ACCT.FB_COGS)
    const apAcct = await findAccountByCode(ACCT.ACCOUNTS_PAYABLE)

    if (!invAcct || !apAcct) {
      console.warn('[AutoPost] Missing accounts for PO, skipping')
      return
    }

    await createJournalEntry({
      description: `Purchase Order ${poNumber} — ${vendorName}`,
      reference: `PO-${poNumber}`,
      sourceModule: 'inventory',
      sourceId: poId,
      createdBy: postedBy,
      lines: [
        { accountId: invAcct.id, debit: total, credit: 0, narration: `Inventory purchase — PO ${poNumber}` },
        { accountId: apAcct.id, debit: 0, credit: total, narration: `AP — ${vendorName} — PO ${poNumber}` },
      ],
    })
  } catch (error) {
    console.error('[AutoPost] postPurchaseOrder error:', error)
  }
}

/**
 * Create income summary and close revenue/expense accounts for period close.
 * DR all revenue accounts (to zero them), CR Income Summary
 * CR all expense accounts (to zero them), DR Income Summary
 * Net = CR Income Summary - DR Income Summary = Net Income
 * Then: DR/CR Income Summary → Retained Earnings
 */
export async function postPeriodCloseEntries(params: {
  periodId: string
  period: string
  startDate: Date
  endDate: Date
  closedBy: string
}): Promise<{ success: boolean; entries: string[]; error?: string }> {
  const { periodId, period, startDate, endDate, closedBy } = params
  const entryIds: string[] = []

  try {
    // Fetch all posted entries in the period
    const entries = await db.journalEntry.findMany({
      where: {
        status: 'posted',
        date: { gte: startDate, lte: endDate },
      },
      include: { lines: { include: { account: true } } },
    })

    // Aggregate by account
    const accountBalances = new Map<string, { code: string; name: string; type: string; totalDebit: number; totalCredit: number }>()
    for (const entry of entries) {
      for (const line of entry.lines) {
        const acct = line.account
        if (!acct || !acct.active) continue
        const existing = accountBalances.get(acct.id)
        if (existing) {
          existing.totalDebit += line.debit
          existing.totalCredit += line.credit
        } else {
          accountBalances.set(acct.id, {
            code: acct.code,
            name: acct.name,
            type: acct.type,
            totalDebit: line.debit,
            totalCredit: line.credit,
          })
        }
      }
    }

    // Separate revenue and expense accounts with non-zero balances
    const revenueLines: JournalLineInput[] = []
    const expenseLines: JournalLineInput[] = []
    let totalRevenue = 0
    let totalExpenses = 0

    for (const [, acct] of accountBalances) {
      const type = acct.type.toLowerCase()
      if (type === 'revenue') {
        const balance = round2(acct.totalCredit - acct.totalDebit)
        if (Math.abs(balance) < 0.01) continue
        // DR Revenue (to zero), CR Income Summary
        revenueLines.push({
          accountId: acct.code, // we'll need to resolve to id
          debit: balance,
          credit: 0,
          narration: `Close revenue — ${acct.name}`,
        })
        totalRevenue += balance
      } else if (type === 'expense') {
        const balance = round2(acct.totalDebit - acct.totalCredit)
        if (Math.abs(balance) < 0.01) continue
        // CR Expense (to zero), DR Income Summary
        expenseLines.push({
          accountId: acct.code,
          debit: 0,
          credit: balance,
          narration: `Close expense — ${acct.name}`,
        })
        totalExpenses += balance
      }
    }

    if (totalRevenue === 0 && totalExpenses === 0) {
      return { success: true, entries: [], error: 'No revenue or expense balances to close' }
    }

    // We need Income Summary account — try to find or we'll use Retained Earnings directly
    const retainedEarnings = await findAccountByCode(ACCT.RETAINED_EARNINGS)
    if (!retainedEarnings) {
      return { success: false, entries: [], error: 'Retained Earnings account not found' }
    }

    // Net income = Revenue - Expenses
    const netIncome = round2(totalRevenue - totalExpenses)

    // Create revenue closing entry: DR all revenue accounts, CR Retained Earnings
    if (revenueLines.length > 0) {
      // Resolve account codes to IDs
      const resolvedRevenueLines: JournalLineInput[] = []
      for (const line of revenueLines) {
        const acct = await findAccountByCode(line.accountId)
        if (acct) {
          resolvedRevenueLines.push({ ...line, accountId: acct.id })
        }
      }
      // Credit Retained Earnings for total revenue
      resolvedRevenueLines.push({
        accountId: retainedEarnings.id,
        debit: 0,
        credit: totalRevenue,
        narration: `Close revenue to Retained Earnings — ${period}`,
      })

      const result = await createJournalEntry({
        date: endDate,
        description: `Close Revenue Accounts — ${period}`,
        reference: `PERIOD-CLOSE-REV-${period}`,
        sourceModule: 'period_close',
        sourceId: periodId,
        createdBy: closedBy,
        lines: resolvedRevenueLines,
      })
      if (result.success && result.entryId) entryIds.push(result.entryId)
    }

    // Create expense closing entry: CR all expense accounts, DR Retained Earnings
    if (expenseLines.length > 0) {
      const resolvedExpenseLines: JournalLineInput[] = []
      for (const line of expenseLines) {
        const acct = await findAccountByCode(line.accountId)
        if (acct) {
          resolvedExpenseLines.push({ ...line, accountId: acct.id })
        }
      }
      // Debit Retained Earnings for total expenses
      resolvedExpenseLines.push({
        accountId: retainedEarnings.id,
        debit: totalExpenses,
        credit: 0,
        narration: `Close expenses to Retained Earnings — ${period}`,
      })

      const result = await createJournalEntry({
        date: endDate,
        description: `Close Expense Accounts — ${period}`,
        reference: `PERIOD-CLOSE-EXP-${period}`,
        sourceModule: 'period_close',
        sourceId: periodId,
        createdBy: closedBy,
        lines: resolvedExpenseLines,
      })
      if (result.success && result.entryId) entryIds.push(result.entryId)
    }

    return { success: true, entries: entryIds }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[AutoPost] postPeriodCloseEntries error:', msg)
    return { success: false, entries: entryIds, error: msg }
  }
}
