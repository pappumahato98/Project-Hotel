import { NextRequest, NextResponse } from 'next/server'
import { getSalaryBreakdown, calculateGratuity, calculateInsuranceDeduction, calculateCIT, validateMinimumSalary, type CompanyFundType, type MaritalStatus } from '@/lib/nepal-compliance/payroll-engine'

// ─── POST: Preview full payroll ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      basicSalary,
      companyType,
      maritalStatus,
      yearsOfService,
      lifeInsurance,
      healthInsurance,
      citRate,
    } = body as {
      basicSalary?: number
      companyType?: string
      maritalStatus?: string
      yearsOfService?: number
      lifeInsurance?: number
      healthInsurance?: number
      citRate?: number
    }

    // Validate required fields
    if (typeof basicSalary !== 'number' || basicSalary <= 0) {
      return NextResponse.json(
        { error: 'basicSalary is required and must be a positive number.' },
        { status: 400 },
      )
    }

    if (companyType !== 'EPF' && companyType !== 'SSF') {
      return NextResponse.json(
        { error: "companyType must be 'EPF' or 'SSF'." },
        { status: 400 },
      )
    }

    if (maritalStatus !== 'married' && maritalStatus !== 'unmarried') {
      return NextResponse.json(
        { error: "maritalStatus must be 'married' or 'unmarried'." },
        { status: 400 },
      )
    }

    // Derive gross salary from basicSalary (basic is the input, gross = basic / 0.45)
    // When user passes basicSalary directly, compute gross so that basic ≈ 45% of gross
    const grossSalary = Math.round(basicSalary / 0.45)

    // Compute salary breakdown
    const breakdown = getSalaryBreakdown(
      grossSalary,
      companyType as CompanyFundType,
      maritalStatus as MaritalStatus,
      {
        basicSalary,
        lifeInsurancePremium: lifeInsurance,
        healthInsurancePremium: healthInsurance,
        citRate,
      },
    )

    // Gratuity (if years of service provided)
    const gratuity =
      typeof yearsOfService === 'number'
        ? calculateGratuity(basicSalary, yearsOfService)
        : null

    // Insurance breakdown (annual)
    const insurance = calculateInsuranceDeduction(lifeInsurance, healthInsurance)

    // CIT breakdown
    const cit = citRate ? calculateCIT(basicSalary, citRate) : null

    // Minimum salary compliance
    const minimumSalaryCompliance = validateMinimumSalary(basicSalary)

    return NextResponse.json({
      breakdown,
      gratuity,
      insurance,
      cit,
      minimumSalaryCompliance,
    })
  } catch (error) {
    console.error('[payroll-preview] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate payroll preview.' },
      { status: 500 },
    )
  }
}
