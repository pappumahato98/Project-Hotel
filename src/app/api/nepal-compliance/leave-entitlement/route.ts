import { NextRequest, NextResponse } from 'next/server'
import {
  getAllLeaveAllocations,
  getMaternityLeave,
  getPaternityLeave,
  getBereavementLeave,
  getAnnualLeaveEntitlement,
  getNepalHolidaysEnriched,
  type EmploymentType,
} from '@/lib/nepal-compliance/leave-engine'
import { cachedJson, cachedError } from '@/lib/api-response'

// ─── GET: Return all leave entitlements ────────────────────────────────

const VALID_EMPLOYMENT_TYPES: EmploymentType[] = ['permanent', 'contract', 'temporary', 'probation']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const employmentType = searchParams.get('employmentType')

    if (employmentType && !VALID_EMPLOYMENT_TYPES.includes(employmentType as EmploymentType)) {
      return cachedError(`employmentType must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`, 400)
    }

    const allocations = getAllLeaveAllocations()

    // Build response with all leave types
    const entitlements = {
      sick: allocations.sick,
      home: allocations.casual,
      annual: {
        ...allocations.annual,
        byEmploymentType: {
          permanent: getAnnualLeaveEntitlement('permanent'),
          contract: getAnnualLeaveEntitlement('contract'),
          temporary: getAnnualLeaveEntitlement('temporary'),
          probation: getAnnualLeaveEntitlement('probation'),
        },
        currentEntitlement: employmentType
          ? getAnnualLeaveEntitlement(employmentType as EmploymentType)
          : getAnnualLeaveEntitlement('permanent'),
      },
      maternity: {
        ...allocations.maternity,
        breakdown: getMaternityLeave(),
      },
      paternity: {
        ...allocations.paternity,
        days: getPaternityLeave(),
      },
      bereavement: {
        ...allocations.bereavement,
        days: getBereavementLeave(),
      },
      special_women: allocations.special_women,
      publicHolidays: getNepalHolidaysEnriched(2082),
    }

    return cachedJson({
      fiscalYear: '2081/82',
      employmentType: employmentType ?? 'all',
      entitlements,
    }, request, { tier: 'medium' })
  } catch (error) {
    console.error('[leave-entitlement] GET error:', error)

    const msg = error instanceof Error ? error.message : String(error)
    return cachedError('Failed to retrieve leave entitlements.', 500, msg.substring(0, 300))
  }
}
