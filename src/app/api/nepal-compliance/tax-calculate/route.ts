import { NextRequest, NextResponse } from 'next/server'
import { calculateIncomeTax, getTaxSlabs, type MaritalStatus } from '@/lib/nepal-compliance/tax-engine'

// ─── POST: Calculate income tax ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { annualIncome, maritalStatus } = body as {
      annualIncome?: number
      maritalStatus?: string
    }

    if (typeof annualIncome !== 'number' || annualIncome < 0) {
      return NextResponse.json(
        { error: 'annualIncome is required and must be a non-negative number.' },
        { status: 400 },
      )
    }

    if (maritalStatus !== 'married' && maritalStatus !== 'unmarried') {
      return NextResponse.json(
        { error: "maritalStatus must be 'married' or 'unmarried'." },
        { status: 400 },
      )
    }

    const result = calculateIncomeTax(annualIncome, maritalStatus as MaritalStatus)

    return NextResponse.json({
      annualIncome,
      maritalStatus,
      ...result,
    })
  } catch (error) {
    console.error('[tax-calculate] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate income tax.' },
      { status: 500 },
    )
  }
}

// ─── GET: Return current tax slabs ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const maritalStatus = searchParams.get('maritalStatus')

    if (!maritalStatus || (maritalStatus !== 'married' && maritalStatus !== 'unmarried')) {
      return NextResponse.json(
        { error: "Query parameter 'maritalStatus' is required and must be 'married' or 'unmarried'." },
        { status: 400 },
      )
    }

    const slabs = getTaxSlabs(maritalStatus as MaritalStatus)

    return NextResponse.json({
      fiscalYear: '2081/82',
      maritalStatus,
      slabs,
    })
  } catch (error) {
    console.error('[tax-calculate] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve tax slabs.' },
      { status: 500 },
    )
  }
}
