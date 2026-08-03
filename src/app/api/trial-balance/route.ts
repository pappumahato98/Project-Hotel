import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const data = await getOrSet('trial-balance:report', async () => {
      // Fetch all ledger accounts with their journal lines
      const accounts = await db.ledgerAccount.findMany({
        where: { active: true },
        include: {
          journalLines: {
            include: {
              entry: {
                select: { status: true },
              },
            },
          },
        },
        orderBy: { code: 'asc' },
      })

      const trialAccounts = accounts.map((account) => {
        // Only include posted journal entries
        const postedLines = account.journalLines.filter((line) => line.entry.status === 'posted')
        const debitTotal = postedLines.reduce((sum, line) => sum + line.debit, 0)
        const creditTotal = postedLines.reduce((sum, line) => sum + line.credit, 0)

        // Compute balance based on account type
        let balance = 0
        const type = account.type.toLowerCase()
        if (type === 'asset' || type === 'expense') {
          balance = debitTotal - creditTotal
        } else if (type === 'liability' || type === 'equity' || type === 'revenue') {
          balance = creditTotal - debitTotal
        }

        return {
          code: account.code,
          name: account.name,
          type: account.type,
          debitTotal: Math.round(debitTotal * 100) / 100,
          creditTotal: Math.round(creditTotal * 100) / 100,
          balance: Math.round(balance * 100) / 100,
        }
      })

      const totalDebit = trialAccounts.reduce((sum, a) => sum + a.debitTotal, 0)
      const totalCredit = trialAccounts.reduce((sum, a) => sum + a.creditTotal, 0)
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

      return {
        generatedAt: new Date().toISOString(),
        accounts: trialAccounts,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        isBalanced,
      }
    }, 120000) // Cache for 120s

    return NextResponse.json(data)
  } catch (error) {
    console.error('Trial Balance API GET error:', error)
    return NextResponse.json({ error: 'Failed to generate trial balance' }, { status: 500 })
  }
}
