import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getOrSet, afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(request.url)
    const fiscalYear = searchParams.get('fiscalYear')
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    const data = await getOrSet(`budget:list:${fiscalYear || ''}:${department || ''}:${status || ''}`, async () => {
      const where: Prisma.BudgetWhereInput = {}
      if (fiscalYear) where.fiscalYear = fiscalYear
      if (department) where.department = department
      if (status) where.status = status

      const budgets = await db.budget.findMany({
        where,
        orderBy: [{ fiscalYear: 'desc' }, { period: 'desc' }, { createdAt: 'desc' }],
        take: 200,
      })

      // Compute stats from all budgets matching the filter
      const allBudgets = await db.budget.findMany({ where, take: 1000 })
      const totalBudgeted = allBudgets.reduce((sum, b) => sum + b.budgetedAmount, 0)
      const totalActual = allBudgets.reduce((sum, b) => sum + b.actualAmount, 0)
      const variance = totalBudgeted - totalActual

      const byDepartment: Record<string, { budgeted: number; actual: number; variance: number }> = {}
      for (const b of allBudgets) {
        const dept = b.department || 'Unassigned'
        if (!byDepartment[dept]) {
          byDepartment[dept] = { budgeted: 0, actual: 0, variance: 0 }
        }
        byDepartment[dept].budgeted += b.budgetedAmount
        byDepartment[dept].actual += b.actualAmount
        byDepartment[dept].variance += b.budgetedAmount - b.actualAmount
      }

      return {
        budgets,
        stats: { totalBudgeted, totalActual, variance, byDepartment },
      }
    }, 120000) // Cache for 120s

    return NextResponse.json(data)
  } catch (error) {
    console.error('Budget API GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { name, fiscalYear, period, budgetedAmount, accountId, accountName, accountCode, department, notes } = body

    if (!name || !fiscalYear || !period || budgetedAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, fiscalYear, period, budgetedAmount' },
        { status: 400 },
      )
    }

    const record = await db.budget.create({
      data: {
        name,
        fiscalYear: String(fiscalYear),
        period: String(period),
        budgetedAmount: parseFloat(budgetedAmount),
        accountId: accountId || null,
        accountName: accountName || null,
        accountCode: accountCode || null,
        department: department || null,
        notes: notes || null,
      },
    })

    afterMutation('accounting')
    broadcastEvent('budget:created', record)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Budget API POST error:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const body = await request.json()
    const { id, name, fiscalYear, period, budgetedAmount, actualAmount, accountId, accountName, accountCode, department, status, notes } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (status && !['Active', 'Closed', 'Archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Active, Closed, or Archived' },
        { status: 400 },
      )
    }

    const data: Prisma.BudgetUpdateInput = {}
    if (name !== undefined) data.name = name
    if (fiscalYear !== undefined) data.fiscalYear = String(fiscalYear)
    if (period !== undefined) data.period = String(period)
    if (budgetedAmount !== undefined) data.budgetedAmount = parseFloat(budgetedAmount)
    if (actualAmount !== undefined) data.actualAmount = parseFloat(actualAmount)
    if (accountId !== undefined) data.accountId = accountId || null
    if (accountName !== undefined) data.accountName = accountName || null
    if (accountCode !== undefined) data.accountCode = accountCode || null
    if (department !== undefined) data.department = department || null
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes || null

    const record = await db.budget.update({
      where: { id },
      data,
    })

    afterMutation('accounting')
    broadcastEvent('budget:updated', record)
    return NextResponse.json(record)
  } catch (error) {
    console.error('Budget API PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 })
  }
}
