import { NextRequest, NextResponse } from 'next/server'
import { calculateIncomeTax, getTaxSlabs, type MaritalStatus } from '@/lib/nepal-compliance/tax-engine'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// ─── POST: Calculate income tax ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { annualIncome, maritalStatus } = body as {
      annualIncome?: number
      maritalStatus?: string
    }

    if (typeof annualIncome !== 'number' || annualIncome < 0) {
      return cachedError('annualIncome is required and must be a non-negative number.', 400)
    }

    if (maritalStatus !== 'married' && maritalStatus !== 'unmarried') {
      return cachedError("maritalStatus must be 'married' or 'unmarried'.", 400)
    }

    const result = calculateIncomeTax(annualIncome, maritalStatus as MaritalStatus)

    return NextResponse.json({
      annualIncome,
      maritalStatus,
      ...result,
    }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('[tax-calculate] POST error:', error)
    return cachedError('Failed to calculate income tax.', 500)
  }
}

// ─── GET: Return current tax slabs ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const maritalStatus = searchParams.get('maritalStatus')

    if (!maritalStatus || (maritalStatus !== 'married' && maritalStatus !== 'unmarried')) {
      return cachedError("Query parameter 'maritalStatus' is required and must be 'married' or 'unmarried'.", 400)
    }

    const slabs = getTaxSlabs(maritalStatus as MaritalStatus)

    return cachedJson({
      fiscalYear: '2081/82',
      maritalStatus,
      slabs,
    }, request, { tier: 'long' })
  } catch (error) {
    console.error('[tax-calculate] GET error:', error)
    return cachedError('Failed to retrieve tax slabs.', 500)
  }
}
