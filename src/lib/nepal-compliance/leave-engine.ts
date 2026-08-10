/**
 * Nepal Leave Compliance Engine
 *
 * Implements leave entitlements per Nepal Labor Act 2074 BS:
 *   - Sick Leave: 12 days/year (1 day/BS month, pro-rated)
 *   - Home Leave (Casual): 10 days/year (1 day/BS month, pro-rated, not carry-forward)
 *   - Public Holidays: Per government declaration
 *   - Maternity Leave: 98 days (14 prenatal + 84 postnatal)
 *   - Paternity Leave: 15 days
 *   - Bereavement Leave: 13 days (immediate family)
 *   - Special Leave for Women: 1 day/BS month (menstrual leave)
 *
 * Leave allocation happens at the START of each BS month.
 * Sick and home leave are allocated monthly (1 day each per BS month).
 */

import { getNepaliHolidays, bsToAD } from '@/lib/nepali-calendar'

// ── Types ─────────────────────────────────────────────────────────────

/** Leave type identifiers matching Prisma LeaveRequest.leaveType */
export type LeaveType =
  | 'sick'
  | 'casual'
  | 'annual'
  | 'maternity'
  | 'paternity'
  | 'bereavement'
  | 'special_women'
  | 'unpaid'
  | 'comp_off'

/** Employment type affecting annual leave entitlement */
export type EmploymentType = 'permanent' | 'contract' | 'temporary' | 'probation'

/** A public holiday entry */
export interface Holiday {
  bsMonth: number
  bsDay: number
  name: string
  nameEn: string
  adDate?: Date
}

/** Leave accrual result */
export interface LeaveAccrualResult {
  /** Days added this period */
  added: number
  /** New balance after accrual */
  newBalance: number
  /** Whether the balance was capped at maximum */
  isCapped: boolean
  /** Maximum allowed balance (0 = unlimited) */
  maxAllowed: number
}

/** Leave allocation configuration */
export interface LeaveAllocation {
  leaveType: LeaveType
  annualEntitlement: number
  monthlyAllocation: number
  carryForward: boolean
  maxAccumulation: number // 0 = unlimited
  description: string
}

// ── Constants ─────────────────────────────────────────────────────────

/** Annual sick leave entitlement (12 days = 1 day/month × 12 BS months) */
const SICK_LEAVE_ANNUAL = 12

/** Sick leave monthly allocation */
const SICK_LEAVE_MONTHLY = 1

/** Sick leave max accumulation (typically 45 days) */
const SICK_LEAVE_MAX = 45

/** Annual home/casual leave entitlement (10 days) */
const HOME_LEAVE_ANNUAL = 10

/** Home leave monthly allocation */
const HOME_LEAVE_MONTHLY = 1

/** Home leave is NOT carry-forward */
const HOME_LEAVE_MAX = 10

/** Maternity leave total days (Labor Act 2074 BS) */
const MATERNITY_LEAVE_DAYS = 98

/** Maternity prenatal leave */
const MATERNITY_PRENATAL = 14

/** Maternity postnatal leave */
const MATERNITY_POSTNATAL = 84

/** Paternity leave days */
const PATERNITY_LEAVE_DAYS = 15

/** Bereavement leave days (immediate family) */
const BEREAVEMENT_LEAVE_DAYS = 13

/** Special leave for women (menstrual leave) — 1 day per BS month */
const SPECIAL_WOMEN_MONTHLY = 1

/** Annual leave by employment type (days per year) */
const ANNUAL_LEAVE_BY_TYPE: Record<EmploymentType, number> = {
  permanent: 15,
  contract: 12,
  temporary: 10,
  probation: 10,
}

/** Leave allocation rules keyed by leave type */
const LEAVE_ALLOCATIONS: Record<string, LeaveAllocation> = {
  sick: {
    leaveType: 'sick',
    annualEntitlement: SICK_LEAVE_ANNUAL,
    monthlyAllocation: SICK_LEAVE_MONTHLY,
    carryForward: true,
    maxAccumulation: SICK_LEAVE_MAX,
    description: 'Sick leave — 1 day per BS month, carry-forward up to 45 days',
  },
  casual: {
    leaveType: 'casual',
    annualEntitlement: HOME_LEAVE_ANNUAL,
    monthlyAllocation: HOME_LEAVE_MONTHLY,
    carryForward: false,
    maxAccumulation: HOME_LEAVE_MAX,
    description: 'Home/Casual leave — 1 day per BS month, not carry-forward',
  },
  annual: {
    leaveType: 'annual',
    annualEntitlement: 15,
    monthlyAllocation: 0,
    carryForward: true,
    maxAccumulation: 90,
    description: 'Annual leave — 15 days/year for permanent employees',
  },
  maternity: {
    leaveType: 'maternity',
    annualEntitlement: MATERNITY_LEAVE_DAYS,
    monthlyAllocation: 0,
    carryForward: false,
    maxAccumulation: MATERNITY_LEAVE_DAYS,
    description: 'Maternity leave — 98 days (14 prenatal + 84 postnatal)',
  },
  paternity: {
    leaveType: 'paternity',
    annualEntitlement: PATERNITY_LEAVE_DAYS,
    monthlyAllocation: 0,
    carryForward: false,
    maxAccumulation: PATERNITY_LEAVE_DAYS,
    description: 'Paternity leave — 15 days',
  },
  bereavement: {
    leaveType: 'bereavement',
    annualEntitlement: BEREAVEMENT_LEAVE_DAYS,
    monthlyAllocation: 0,
    carryForward: false,
    maxAccumulation: BEREAVEMENT_LEAVE_DAYS,
    description: 'Bereavement leave — 13 days for immediate family',
  },
  special_women: {
    leaveType: 'special_women',
    annualEntitlement: 12,
    monthlyAllocation: SPECIAL_WOMEN_MONTHLY,
    carryForward: false,
    maxAccumulation: 12,
    description: 'Special leave for women (menstrual) — 1 day per BS month',
  },
}

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Get sick leave allocation for a BS month.
 *
 * Per Labor Act: 1 day per BS month (12 days/year).
 * Allocated at the START of each BS month.
 *
 * @param _bsYear - BS year (reserved for future rate changes)
 * @param _bsMonth - BS month (1-12)
 * @returns Number of sick leave days allocated (always 1)
 */
export function getSickLeaveAllocation(_bsYear: number, _bsMonth: number): number {
  return SICK_LEAVE_MONTHLY
}

/**
 * Get home/casual leave allocation for a BS month.
 *
 * Per Labor Act: 1 day per BS month (10 days/year).
 * Not carry-forward — expires at end of fiscal year.
 *
 * @param _bsYear - BS year (reserved for future rate changes)
 * @param _bsMonth - BS month (1-12)
 * @returns Number of home leave days allocated (always 1)
 */
export function getHomeLeaveAllocation(_bsYear: number, _bsMonth: number): number {
  return HOME_LEAVE_MONTHLY
}

/**
 * Get total maternity leave entitlement.
 *
 * Per Labor Act 2074 BS: 98 days total (14 prenatal + 84 postnatal).
 *
 * @returns Total maternity leave days (98)
 */
export function getMaternityLeave(): { total: number; prenatal: number; postnatal: number } {
  return {
    total: MATERNITY_LEAVE_DAYS,
    prenatal: MATERNITY_PRENATAL,
    postnatal: MATERNITY_POSTNATAL,
  }
}

/**
 * Get paternity leave entitlement.
 *
 * Per Labor Act 2074 BS: 15 days.
 *
 * @returns Paternity leave days (15)
 */
export function getPaternityLeave(): number {
  return PATERNITY_LEAVE_DAYS
}

/**
 * Get bereavement leave entitlement.
 *
 * Per Labor Act 2074 BS: 13 days for immediate family members.
 *
 * @returns Bereavement leave days (13)
 */
export function getBereavementLeave(): number {
  return BEREAVEMENT_LEAVE_DAYS
}

/**
 * Get special leave for women (menstrual leave) allocation.
 *
 * Per Labor Act 2074 BS: 1 day per BS month.
 *
 * @param _bsYear - BS year (reserved for future rate changes)
 * @param _bsMonth - BS month (1-12)
 * @returns Number of special leave days allocated (always 1)
 */
export function getSpecialLeaveWomen(_bsYear: number, _bsMonth: number): number {
  return SPECIAL_WOMEN_MONTHLY
}

/**
 * Get annual leave entitlement based on employment type.
 *
 * Permanent: 15 days, Contract: 12 days, Temporary/Probation: 10 days.
 *
 * @param employmentType - Employee's employment type
 * @returns Annual leave days entitlement
 */
export function getAnnualLeaveEntitlement(employmentType: EmploymentType): number {
  return ANNUAL_LEAVE_BY_TYPE[employmentType] ?? ANNUAL_LEAVE_BY_TYPE.permanent
}

/**
 * Calculate leave accrual for a given month.
 *
 * Determines how many leave days to add based on leave type
 * and BS month, then applies the maximum accumulation cap.
 *
 * @param leaveType - Type of leave
 * @param _bsYear - BS year
 * @param _bsMonth - BS month (1-12)
 * @param currentBalance - Current leave balance before accrual
 * @param maxAllowed - Maximum allowed balance (0 = use type default)
 * @returns Leave accrual result with new balance
 */
export function calculateLeaveAccrual(
  leaveType: LeaveType,
  _bsYear: number,
  _bsMonth: number,
  currentBalance: number,
  maxAllowed: number = 0,
): LeaveAccrualResult {
  const allocation = LEAVE_ALLOCATIONS[leaveType]

  // For leave types with monthly allocation (sick, casual, special_women)
  const added = allocation?.monthlyAllocation ?? 0

  // For types without monthly allocation (maternity, paternity, etc.),
  // no monthly accrual — they are granted on demand
  const effectiveMax = maxAllowed > 0 ? maxAllowed : (allocation?.maxAccumulation ?? 0)

  let newBalance = currentBalance + added
  let isCapped = false

  if (effectiveMax > 0 && newBalance > effectiveMax) {
    newBalance = effectiveMax
    isCapped = true
  }

  return { added, newBalance, isCapped, maxAllowed: effectiveMax }
}

/**
 * Get all Nepal public holidays for a BS year.
 *
 * Delegates to the existing `getNepaliHolidays()` from nepali-calendar.ts
 * and enriches each entry with an AD date where calculable.
 *
 * @param bsYear - BS year to get holidays for
 * @returns Array of holiday entries with BS dates and names
 */
export function getNepalHolidaysEnriched(bsYear: number): Holiday[] {
  const rawHolidays = getNepaliHolidays(bsYear)

  return rawHolidays.map((h) => {
    let adDate: Date | undefined
    try {
      adDate = bsToAD(bsYear, h.bsMonth, h.bsDay)
    } catch {
      // If conversion fails, leave adDate undefined
    }
    return {
      bsMonth: h.bsMonth,
      bsDay: h.bsDay,
      name: h.name,
      nameEn: h.nameEn,
      adDate,
    }
  })
}

/**
 * Get the leave allocation configuration for a leave type.
 *
 * @param leaveType - The leave type to look up
 * @returns Leave allocation configuration or undefined if not found
 */
export function getLeaveAllocationConfig(leaveType: LeaveType): LeaveAllocation | undefined {
  return LEAVE_ALLOCATIONS[leaveType]
}

/**
 * Get all leave allocation configurations.
 *
 * @returns Record of all leave type allocations
 */
export function getAllLeaveAllocations(): Record<string, LeaveAllocation> {
  return { ...LEAVE_ALLOCATIONS }
}
