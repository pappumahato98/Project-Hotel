import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

// ─── Account code constants ─────────────────────────────────────────────
const ACCT = {
  CASH: '1000',
  ACCOUNTS_RECEIVABLE: '1200',
  CARD_RECEIVABLE: '1300',
  ACCOUNTS_PAYABLE: '2000',
  VAT_PAYABLE: '2100',
  ROOM_REVENUE: '4000',
  FB_REVENUE: '4100',
  EVENTS_REVENUE: '4400',
  OTHER_REVENUE: '4500',
  SALARY_WAGES: '5000',
  INVENTORY_FOOD_COST: '5300',
} as const

type ModuleType =
  | 'room_revenue'
  | 'pos_revenue'
  | 'payroll'
  | 'inventory_po'
  | 'events'
  | 'night_audit'
  | 'invoice_payment'
  | 'folio_settlement'

type PostAction = 'post' | 'reverse'

interface PostRequest {
  module: ModuleType
  action: PostAction
  data: Record<string, unknown>
}

interface JournalLineInput {
  accountId: string
  debit: number
  credit: number
  narration?: string
}

/**
 * Find a LedgerAccount by code. Returns null if not found.
 */
async function findAccountByCode(code: string) {
  return db.ledgerAccount.findUnique({ where: { code } })
}

/**
 * Build journal lines for a specific module, then create the journal entry.
 * For 'reverse', the debit/credit amounts are swapped.
 */
async function generateAndCreateEntry(
  module: ModuleType,
  action: PostAction,
  data: Record<string, unknown>,
  postedBy: string,
): Promise<{ success: boolean; entry?: unknown; error?: string }> {
  const multiplier = action === 'reverse' ? -1 : 1
  const suffix = action === 'reverse' ? ' [REVERSAL]' : ''

  let description = ''
  let reference: string | null = null
  let sourceId: string | null = null
  let lines: JournalLineInput[] = []

  try {
    switch (module) {
      // ─── ROOM REVENUE ────────────────────────────────────────
      case 'room_revenue': {
        const { folioId, reservationId, guestName, amount, taxAmount, description: desc, reference: ref } = data as {
          folioId?: string; reservationId?: string; guestName?: string
          amount: number; taxAmount: number; description?: string; reference?: string
        }
        const total = (amount || 0) + (taxAmount || 0)
        const netAmount = amount || 0
        const tax = taxAmount || 0

        const cashAcct = await findAccountByCode(ACCT.CASH)
        const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)
        const revAcct = await findAccountByCode(ACCT.ROOM_REVENUE)
        const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

        if (!cashAcct || !arAcct || !revAcct || !vatAcct) {
          const missing = [
            !cashAcct && ACCT.CASH,
            !arAcct && ACCT.ACCOUNTS_RECEIVABLE,
            !revAcct && ACCT.ROOM_REVENUE,
            !vatAcct && ACCT.VAT_PAYABLE,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        // DR Accounts Receivable for total (will be settled later)
        lines = [
          { accountId: arAcct.id, debit: total * multiplier, credit: 0, narration: `Room charge - ${guestName || 'Guest'}` },
          { accountId: revAcct.id, debit: 0, credit: netAmount * multiplier, narration: desc || `Room revenue - ${guestName || 'Guest'}` },
        ]
        if (tax > 0) {
          lines.push({ accountId: vatAcct.id, debit: 0, credit: tax * multiplier, narration: 'VAT on room revenue' })
        }

        description = `Room Revenue - ${guestName || 'Guest'}${suffix}`
        reference = ref || `FOLIO-${folioId || reservationId || 'N/A'}`
        sourceId = folioId || reservationId || null
        break
      }

      // ─── POS REVENUE ─────────────────────────────────────────
      case 'pos_revenue': {
        const { outletName, orderId, amount, taxAmount, description: desc, reference: ref } = data as {
          outletName?: string; orderId?: string; amount: number; taxAmount: number
          description?: string; reference?: string
        }
        const netAmount = amount || 0
        const tax = taxAmount || 0
        const total = netAmount + tax

        const cashAcct = await findAccountByCode(ACCT.CASH)
        const cardAcct = await findAccountByCode(ACCT.CARD_RECEIVABLE)
        const fbAcct = await findAccountByCode(ACCT.FB_REVENUE)
        const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

        if (!cashAcct || !fbAcct || !vatAcct) {
          const missing = [
            !cashAcct && ACCT.CASH,
            !fbAcct && ACCT.FB_REVENUE,
            !vatAcct && ACCT.VAT_PAYABLE,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        // DR Cash for total
        lines = [
          { accountId: cashAcct.id, debit: total * multiplier, credit: 0, narration: `F&B sale - ${outletName || 'Outlet'}` },
          { accountId: fbAcct.id, debit: 0, credit: netAmount * multiplier, narration: desc || `F&B revenue - ${outletName || 'Outlet'}` },
        ]
        if (tax > 0) {
          lines.push({ accountId: vatAcct.id, debit: 0, credit: tax * multiplier, narration: 'VAT on F&B revenue' })
        }

        description = `F&B Revenue - ${outletName || 'POS'}${suffix}`
        reference = ref || `POS-${orderId || 'N/A'}`
        sourceId = orderId || null
        break
      }

      // ─── PAYROLL ─────────────────────────────────────────────
      case 'payroll': {
        const { employeeName, department, grossPay, deductions, netPay, month, reference: ref } = data as {
          employeeName?: string; department?: string; grossPay: number
          deductions: number; netPay: number; month: string; reference?: string
        }
        const gross = grossPay || 0
        const deduct = deductions || 0
        const net = netPay || 0

        const salaryAcct = await findAccountByCode(ACCT.SALARY_WAGES)
        const cashAcct = await findAccountByCode(ACCT.CASH)
        const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

        if (!salaryAcct || !cashAcct) {
          const missing = [
            !salaryAcct && ACCT.SALARY_WAGES,
            !cashAcct && ACCT.CASH,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        // DR Salary & Wages for gross pay
        // CR Cash/Bank for net pay
        // CR Tax Payable for deductions
        lines = [
          { accountId: salaryAcct.id, debit: gross * multiplier, credit: 0, narration: `Salary - ${employeeName || 'Employee'} (${month})` },
        ]
        lines.push(
          { accountId: cashAcct.id, debit: 0, credit: net * multiplier, narration: `Net pay - ${employeeName || 'Employee'}` },
        )
        if (deduct > 0) {
          const taxAcctId = vatAcct?.id
          if (taxAcctId) {
            lines.push({ accountId: taxAcctId, debit: 0, credit: deduct * multiplier, narration: `Tax deductions - ${employeeName || 'Employee'}` })
          } else {
            // If no tax payable account, credit cash for the full gross
            lines[1] = { ...lines[1], credit: gross * multiplier }
          }
        }

        description = `Payroll - ${employeeName || 'Employee'} (${month})${suffix}`
        reference = ref || `PAYROLL-${month}`
        sourceId = null
        break
      }

      // ─── INVENTORY PURCHASE ORDER ────────────────────────────
      case 'inventory_po': {
        const { vendorName, poNumber, totalAmount, reference: ref } = data as {
          vendorName?: string; poNumber: string; items?: unknown[]
          totalAmount: number; reference?: string
        }
        const total = totalAmount || 0

        const invAcct = await findAccountByCode(ACCT.INVENTORY_FOOD_COST)
        const apAcct = await findAccountByCode(ACCT.ACCOUNTS_PAYABLE)

        if (!invAcct || !apAcct) {
          const missing = [
            !invAcct && ACCT.INVENTORY_FOOD_COST,
            !apAcct && ACCT.ACCOUNTS_PAYABLE,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        lines = [
          { accountId: invAcct.id, debit: total * multiplier, credit: 0, narration: `Inventory purchase - PO ${poNumber}` },
          { accountId: apAcct.id, debit: 0, credit: total * multiplier, narration: `AP - ${vendorName || 'Vendor'} - PO ${poNumber}` },
        ]

        description = `Purchase Order ${poNumber} - ${vendorName || 'Vendor'}${suffix}`
        reference = ref || `PO-${poNumber}`
        sourceId = null
        break
      }

      // ─── EVENTS ───────────────────────────────────────────────
      case 'events': {
        const { eventName, amount, taxAmount, description: desc, reference: ref } = data as {
          eventName?: string; amount: number; taxAmount: number
          description?: string; reference?: string
        }
        const netAmount = amount || 0
        const tax = taxAmount || 0
        const total = netAmount + tax

        const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)
        const cashAcct = await findAccountByCode(ACCT.CASH)
        const eventsAcct = await findAccountByCode(ACCT.EVENTS_REVENUE)
        const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

        if (!arAcct || !eventsAcct || !vatAcct) {
          const missing = [
            !arAcct && ACCT.ACCOUNTS_RECEIVABLE,
            !eventsAcct && ACCT.EVENTS_REVENUE,
            !vatAcct && ACCT.VAT_PAYABLE,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        // DR Accounts Receivable for total
        lines = [
          { accountId: arAcct.id, debit: total * multiplier, credit: 0, narration: `Event - ${eventName || 'Event'}` },
          { accountId: eventsAcct.id, debit: 0, credit: netAmount * multiplier, narration: desc || `Events revenue - ${eventName || 'Event'}` },
        ]
        if (tax > 0) {
          lines.push({ accountId: vatAcct.id, debit: 0, credit: tax * multiplier, narration: 'VAT on events revenue' })
        }

        description = `Events Revenue - ${eventName || 'Event'}${suffix}`
        reference = ref || `EVENT-${eventName || 'N/A'}`
        sourceId = null
        break
      }

      // ─── NIGHT AUDIT (summary posting) ────────────────────────
      case 'night_audit': {
        const { roomRevenue, fbRevenue, otherRevenue, taxCollected, reference: ref } = data as {
          roomRevenue?: number; fbRevenue?: number; otherRevenue?: number
          taxCollected?: number; reference?: string; businessDate?: string
        }
        const room = roomRevenue || 0
        const fb = fbRevenue || 0
        const other = otherRevenue || 0
        const tax = taxCollected || 0
        const totalRevenue = room + fb + other

        const cashAcct = await findAccountByCode(ACCT.CASH)
        const roomAcct = await findAccountByCode(ACCT.ROOM_REVENUE)
        const fbAcct = await findAccountByCode(ACCT.FB_REVENUE)
        const otherAcct = await findAccountByCode(ACCT.OTHER_REVENUE)
        const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

        if (!cashAcct || !roomAcct) {
          const missing = [
            !cashAcct && ACCT.CASH,
            !roomAcct && ACCT.ROOM_REVENUE,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        lines = [
          { accountId: cashAcct.id, debit: totalRevenue * multiplier, credit: 0, narration: 'Night audit - total daily revenue' },
        ]
        if (room > 0) {
          lines.push({ accountId: roomAcct.id, debit: 0, credit: room * multiplier, narration: 'Night audit - room revenue' })
        }
        if (fb > 0 && fbAcct) {
          lines.push({ accountId: fbAcct.id, debit: 0, credit: fb * multiplier, narration: 'Night audit - F&B revenue' })
        }
        if (other > 0 && otherAcct) {
          lines.push({ accountId: otherAcct.id, debit: 0, credit: other * multiplier, narration: 'Night audit - other revenue' })
        }
        if (tax > 0 && vatAcct) {
          lines.push({ accountId: vatAcct.id, debit: 0, credit: tax * multiplier, narration: 'Night audit - VAT collected' })
        }

        description = `Night Audit Summary${suffix}`
        reference = ref || `NA-${new Date().toISOString().slice(0, 10)}`
        sourceId = null
        break
      }

      // ─── INVOICE PAYMENT ──────────────────────────────────────
      case 'invoice_payment': {
        const { invoiceId, invoiceNumber, amount, paymentMethod, reference: ref } = data as {
          invoiceId?: string; invoiceNumber: string; amount: number
          paymentMethod?: string; reference?: string
        }
        const total = amount || 0

        const cashAcct = await findAccountByCode(ACCT.CASH)
        const arAcct = await findAccountByCode(ACCT.ACCOUNTS_RECEIVABLE)

        if (!cashAcct) {
          return { success: false, error: `Missing account: ${ACCT.CASH}` }
        }

        const creditAccountId = arAcct?.id || cashAcct.id
        lines = [
          { accountId: cashAcct.id, debit: total * multiplier, credit: 0, narration: `Payment received - INV ${invoiceNumber}` },
          { accountId: creditAccountId, debit: 0, credit: total * multiplier, narration: `Invoice ${invoiceNumber} payment${paymentMethod ? ` via ${paymentMethod}` : ''}` },
        ]

        description = `Invoice Payment - ${invoiceNumber}${suffix}`
        reference = ref || `INV-PAY-${invoiceNumber}`
        sourceId = invoiceId || null
        break
      }

      // ─── FOLIO SETTLEMENT ─────────────────────────────────────
      case 'folio_settlement': {
        const { folioId, guestName, roomRevenue, fbRevenue, otherRevenue, taxCollected, payments, reference: ref } = data as {
          folioId?: string; guestName?: string; totalCharges?: number
          payments?: number; roomRevenue: number; fbRevenue: number
          otherRevenue: number; taxCollected: number; reference?: string
        }
        const room = roomRevenue || 0
        const fb = fbRevenue || 0
        const other = otherRevenue || 0
        const tax = taxCollected || 0
        const total = room + fb + other + tax

        const cashAcct = await findAccountByCode(ACCT.CASH)
        const cardAcct = await findAccountByCode(ACCT.CARD_RECEIVABLE)
        const roomAcct = await findAccountByCode(ACCT.ROOM_REVENUE)
        const fbAcct = await findAccountByCode(ACCT.FB_REVENUE)
        const otherAcct = await findAccountByCode(ACCT.OTHER_REVENUE)
        const vatAcct = await findAccountByCode(ACCT.VAT_PAYABLE)

        if (!cashAcct || !roomAcct || !fbAcct) {
          const missing = [
            !cashAcct && ACCT.CASH,
            !roomAcct && ACCT.ROOM_REVENUE,
            !fbAcct && ACCT.FB_REVENUE,
          ].filter(Boolean).join(', ')
          return { success: false, error: `Missing accounts: ${missing}` }
        }

        // DR Cash/Card Receivable for total
        lines = [
          { accountId: cashAcct.id, debit: total * multiplier, credit: 0, narration: `Folio settlement - ${guestName || 'Guest'}` },
        ]
        if (room > 0) {
          lines.push({ accountId: roomAcct.id, debit: 0, credit: room * multiplier, narration: `Room revenue - ${guestName || 'Guest'}` })
        }
        if (fb > 0) {
          lines.push({ accountId: fbAcct.id, debit: 0, credit: fb * multiplier, narration: `F&B revenue - ${guestName || 'Guest'}` })
        }
        if (other > 0 && otherAcct) {
          lines.push({ accountId: otherAcct.id, debit: 0, credit: other * multiplier, narration: `Other revenue - ${guestName || 'Guest'}` })
        }
        if (tax > 0 && vatAcct) {
          lines.push({ accountId: vatAcct.id, debit: 0, credit: tax * multiplier, narration: 'VAT collected' })
        }

        description = `Folio Settlement - ${guestName || 'Guest'}${suffix}`
        reference = ref || `FOLIO-SETTLE-${folioId || 'N/A'}`
        sourceId = folioId || null
        break
      }

      default:
        return { success: false, error: `Unknown module: ${module}` }
    }

    // Normalize negative values for reversal (debit/credit should never be negative in DB)
    // For reversal, we swap debit↔credit and keep positive values
    const normalizedLines = lines.map((line) => {
      if (multiplier === -1) {
        return {
          ...line,
          debit: Math.max(0, Math.abs(line.credit)),
          credit: Math.max(0, Math.abs(line.debit)),
        }
      }
      return {
        ...line,
        debit: Math.max(0, line.debit),
        credit: Math.max(0, line.credit),
      }
    })

    // Create the journal entry
    const entry = await db.journalEntry.create({
      data: {
        date: new Date(),
        description,
        reference,
        status: 'posted', // Auto-posted entries are immediately posted
        sourceModule: module,
        sourceId,
        createdBy: postedBy,
        postedBy,
        postedAt: new Date(),
        lines: {
          create: normalizedLines,
        },
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true, type: true } },
          },
        },
      },
    })

    afterMutation('accounting')
    broadcastEvent('journal_entry:auto_posted', { module, action, entryId: entry.id })

    return { success: true, entry }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`Auto-post error (${module}/${action}):`, msg)
    return { success: false, error: msg }
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request) // Any authenticated user can post journal entries
  if (auth instanceof NextResponse) return auth

  try {
    const body: PostRequest = await request.json()
    const { module, action, data } = body

    if (!module || !action) {
      return cachedError('module and action are required', 400)
    }

    const validModules: ModuleType[] = [
      'room_revenue', 'pos_revenue', 'payroll', 'inventory_po',
      'events', 'night_audit', 'invoice_payment', 'folio_settlement',
    ]
    if (!validModules.includes(module)) {
      return cachedError(`Invalid module. Must be one of: ${validModules.join(', ')}`, 400)
    }

    if (action !== 'post' && action !== 'reverse') {
      return cachedError("action must be 'post' or 'reverse'", 400)
    }

    if (!data || typeof data !== 'object') {
      return cachedError('data object is required', 400)
    }

    const postedBy = `${auth.user.firstName} ${auth.user.lastName}`
    const result = await generateAndCreateEntry(module, action, data, postedBy)

    if (!result.success) {
      return cachedError(result.error ?? 'Auto-posting failed', 400)
    }

    return NextResponse.json(result.entry, { status: 201, headers: clearCacheHeaders() })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Auto-posting engine error:', msg)
    return cachedError('Auto-posting failed', 500, msg.substring(0, 200))
  }
}
