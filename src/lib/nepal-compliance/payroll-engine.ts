/**
 * Nepal Payroll Compliance Engine
 *
 * Covers: EPF, SSF, Gratuity, CIT, Insurance deductions,
 * minimum salary validation, and full salary breakdown computation.
 *
 * References:
 *   - Employees Provident Fund Act
 *   - Social Security Act 2075 BS
 *   - Labor Act 2074 BS, Section 74 (Gratuity)
 *   - Income Tax Act 2058 BS (insurance deductions)
 *
 * All amounts in NPR (Nepalese Rupees).
 */

import { calculateIncomeTax, type MaritalStatus } from './tax-engine'

// ── Types ─────────────────────────────────────────────────────────────

/** Company retirement fund type */
export type CompanyFundType = 'EPF' | 'SSF'

/** EPF calculation result */
export interface EPFResult {
  /** Employee's EPF contribution (deducted from salary) */
  employeeContribution: number
  /** Employer's EPF contribution (goes to employee's PF account) */
  employerContribution: number
  /** Total PF deposited for the employee this month */
  total: number
}

/** SSF calculation result */
export interface SSFResult {
  /** Employee's SSF contribution (deducted from salary) */
  employeeContribution: number
  /** Employer's SSF contribution */
  employerContribution: number
  /** Total SSF deposited this month */
  total: number
}

/** Gratuity calculation result */
export interface GratuityResult {
  /** Daily gratuity rate (last basic ÷ 30) */
  dailyRate: number
  /** Gratuity per year of service (daily rate × 15) */
  perYearAmount: number
  /** Days of gratuity per year of service */
  perYearDays: number
  /** Total gratuity amount */
  total: number
  /** Whether the employee is eligible (3+ years) */
  eligible: boolean
  /** Reason if not eligible */
  ineligibilityReason?: string
}

/** Insurance deduction result */
export interface InsuranceDeductionResult {
  /** Life insurance deduction claimed */
  lifeDeduction: number
  /** Health insurance deduction claimed */
  healthDeduction: number
  /** Total insurance deduction */
  total: number
  /** Life insurance max deduction limit */
  lifeLimit: number
  /** Health insurance max deduction limit */
  healthLimit: number
}

/** CIT (Citizens Investment Trust) calculation result */
export interface CITResult {
  /** Monthly CIT deduction from salary */
  amount: number
  /** Applicable CIT rate */
  citRate: number
  /** Estimated tax rebate (typically 10% of invested amount) */
  taxRebate: number
}

/** Full salary breakdown */
export interface SalaryBreakdown {
  /* ── Input ── */
  grossSalary: number
  basicSalary: number
  allowances: number
  companyFundType: CompanyFundType
  maritalStatus: MaritalStatus

  /* ── Deductions ── */
  epf: EPFResult | null
  ssf: SSFResult | null
  incomeTax: number
  monthlyTDS: number
  insuranceDeduction: number
  citDeduction: number
  totalDeductions: number

  /* ── Net ── */
  netSalary: number
  annualTaxableIncome: number
  annualGrossIncome: number
}

/** Parameters for the full payroll calculation */
export interface PayrollParams {
  /** Monthly gross salary in NPR */
  grossSalary: number
  /** Optional: explicitly set basic salary. Default = 45% of gross */
  basicSalary?: number
  /** Allowances (overtime, dearness, etc.). Default = gross - basic */
  allowances?: number
  /** Company fund type */
  companyFundType: CompanyFundType
  /** Employee marital status for tax calculation */
  maritalStatus: MaritalStatus
  /** Annual life insurance premium paid */
  lifeInsurancePremium?: number
  /** Annual health insurance premium paid */
  healthInsurancePremium?: number
  /** CIT contribution rate (default 0 = not enrolled) */
  citRate?: number
  /** SSF: whether employee is contribution-based (20% employer) or non-contribution (10%) */
  isContributionBasedSSF?: boolean
  /** Additional pre-tax deductions (e.g. provident fund from previous employer) */
  additionalDeductions?: number
}

/** Full payroll calculation result */
export interface PayrollResult {
  breakdown: SalaryBreakdown
  gratuity: GratuityResult | null
  insurance: InsuranceDeductionResult
  cit: CITResult
  minimumSalaryCompliance: MinimumSalaryCheck
}

/** Minimum salary compliance check */
export interface MinimumSalaryCheck {
  /** Whether the basic salary meets the legal minimum */
  compliant: boolean
  /** Legal minimum basic salary per month */
  minimumSalary: number
  /** Shortfall amount (0 if compliant) */
  shortfall: number
}

// ── Constants ─────────────────────────────────────────────────────────

/** EPF employee & employer contribution rate */
const EPF_RATE = 10 // 10% of basic salary

/** SSF employee contribution rate */
const SSF_EMPLOYEE_RATE = 20 // 20% of basic salary

/** SSF employer contribution rate (non-contribution based) */
const SSF_EMPLOYER_NON_CONTRIBUTION_RATE = 10

/** SSF employer contribution rate (contribution based) */
const SSF_EMPLOYER_CONTRIBUTION_RATE = 20

/** Minimum years of service for gratuity eligibility */
const GRATUITY_MIN_YEARS = 3

/** Gratuity days per year of service */
const GRATUITY_DAYS_PER_YEAR = 15

/** Divisor for daily rate calculation */
const GRATUITY_DAILY_DIVISOR = 30

/** Life insurance tax deduction limit per year */
const LIFE_INSURANCE_LIMIT = 40_000

/** Health insurance tax deduction limit per year */
const HEALTH_INSURANCE_LIMIT = 20_000

/** Default CIT rate if enrolled */
const DEFAULT_CIT_RATE = 10

/** CIT tax rebate rate on invested amount */
const CIT_TAX_REBATE_RATE = 10

/** Minimum basic salary per Nepal Labor Act 2074 BS (as of 2081 BS) */
export const NEPAL_MINIMUM_BASIC_SALARY = 17_320

/** Default basic-to-gross ratio when not explicitly provided */
const DEFAULT_BASIC_RATIO = 0.45

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Calculate EPF (Employees Provident Fund) contributions.
 *
 * Employee: 10% of basic salary (deducted from salary)
 * Employer: 10% of basic salary (credited to employee's PF account)
 *
 * @param basicSalary - Monthly basic salary in NPR
 * @returns EPF contribution breakdown
 */
export function calculateEPF(basicSalary: number): EPFResult {
  const employeeContribution = Math.round(basicSalary * (EPF_RATE / 100))
  const employerContribution = Math.round(basicSalary * (EPF_RATE / 100))
  return {
    employeeContribution,
    employerContribution,
    total: employeeContribution + employerContribution,
  }
}

/**
 * Calculate SSF (Social Security Fund) contributions.
 *
 * Per Social Security Act 2075 BS:
 *   Employee: 20% of basic salary
 *   Employer: 20% (contribution-based) or 10% (non-contribution based)
 *
 * @param basicSalary - Monthly basic salary in NPR
 * @param isContributionBased - Whether the employee is contribution-based (default: true)
 * @returns SSF contribution breakdown
 */
export function calculateSSF(
  basicSalary: number,
  isContributionBased: boolean = true,
): SSFResult {
  const employeeContribution = Math.round(basicSalary * (SSF_EMPLOYEE_RATE / 100))
  const employerRate = isContributionBased
    ? SSF_EMPLOYER_CONTRIBUTION_RATE
    : SSF_EMPLOYER_NON_CONTRIBUTION_RATE
  const employerContribution = Math.round(basicSalary * (employerRate / 100))
  return {
    employeeContribution,
    employerContribution,
    total: employeeContribution + employerContribution,
  }
}

/**
 * Calculate gratuity per Labor Act 2074 BS, Section 74.
 *
 * Eligibility: 3+ years of continuous service.
 * Formula: (Last drawn basic salary ÷ 30) × 15 × years_of_service
 *
 * @param lastBasicSalary - Last drawn monthly basic salary in NPR
 * @param yearsOfService - Total years of service (can be fractional)
 * @returns Gratuity calculation result
 */
export function calculateGratuity(
  lastBasicSalary: number,
  yearsOfService: number,
): GratuityResult {
  if (yearsOfService < GRATUITY_MIN_YEARS) {
    return {
      dailyRate: Math.round(lastBasicSalary / GRATUITY_DAILY_DIVISOR),
      perYearAmount: 0,
      perYearDays: GRATUITY_DAYS_PER_YEAR,
      total: 0,
      eligible: false,
      ineligibilityReason: `Minimum ${GRATUITY_MIN_YEARS} years of service required. Current: ${yearsOfService} years.`,
    }
  }

  const dailyRate = Math.round(lastBasicSalary / GRATUITY_DAILY_DIVISOR)
  const perYearAmount = dailyRate * GRATUITY_DAYS_PER_YEAR
  const total = Math.round(perYearAmount * yearsOfService)

  return {
    dailyRate,
    perYearAmount,
    perYearDays: GRATUITY_DAYS_PER_YEAR,
    total,
    eligible: true,
  }
}

/**
 * Calculate insurance deduction for tax purposes.
 *
 * Life insurance premium: deductible up to NPR 40,000/year
 * Health insurance premium: deductible up to NPR 20,000/year
 *
 * @param lifeInsurance - Annual life insurance premium paid
 * @param healthInsurance - Annual health insurance premium paid
 * @returns Insurance deduction breakdown
 */
export function calculateInsuranceDeduction(
  lifeInsurance: number = 0,
  healthInsurance: number = 0,
): InsuranceDeductionResult {
  const lifeDeduction = Math.min(Math.max(0, lifeInsurance), LIFE_INSURANCE_LIMIT)
  const healthDeduction = Math.min(Math.max(0, healthInsurance), HEALTH_INSURANCE_LIMIT)

  return {
    lifeDeduction,
    healthDeduction,
    total: lifeDeduction + healthDeduction,
    lifeLimit: LIFE_INSURANCE_LIMIT,
    healthLimit: HEALTH_INSURANCE_LIMIT,
  }
}

/**
 * Calculate CIT (Citizens Investment Trust) deduction and tax rebate.
 *
 * @param basicSalary - Monthly basic salary in NPR
 * @param citRate - CIT contribution rate as percentage (default: 10)
 * @returns CIT calculation result
 */
export function calculateCIT(
  basicSalary: number,
  citRate: number = DEFAULT_CIT_RATE,
): CITResult {
  const amount = Math.round(basicSalary * (citRate / 100))
  const taxRebate = Math.round(amount * (CIT_TAX_REBATE_RATE / 100))

  return {
    amount,
    citRate,
    taxRebate,
  }
}

/**
 * Validate minimum basic salary compliance per Nepal Labor Act.
 *
 * @param basicSalary - Monthly basic salary in NPR
 * @returns Compliance check result
 */
export function validateMinimumSalary(basicSalary: number): MinimumSalaryCheck {
  const shortfall = Math.max(0, NEPAL_MINIMUM_BASIC_SALARY - basicSalary)
  return {
    compliant: shortfall === 0,
    minimumSalary: NEPAL_MINIMUM_BASIC_SALARY,
    shortfall,
  }
}

/**
 * Generate a full salary breakdown from gross salary.
 *
 * This is the main entry point for payroll computation.
 * It calculates all deductions (EPF/SSF, tax, insurance, CIT)
 * and returns a detailed breakdown.
 *
 * @param grossSalary - Monthly gross salary in NPR
 * @param companyFundType - 'EPF' or 'SSF'
 * @param maritalStatus - 'married' or 'unmarried'
 * @param options - Optional overrides (basicSalary, allowances, etc.)
 * @returns Full salary breakdown
 */
export function getSalaryBreakdown(
  grossSalary: number,
  companyFundType: CompanyFundType,
  maritalStatus: MaritalStatus,
  options?: {
    basicSalary?: number
    allowances?: number
    lifeInsurancePremium?: number
    healthInsurancePremium?: number
    citRate?: number
    isContributionBasedSSF?: boolean
    additionalDeductions?: number
  },
): SalaryBreakdown {
  const basicSalary = options?.basicSalary ?? Math.round(grossSalary * DEFAULT_BASIC_RATIO)
  const allowances = options?.allowances ?? Math.round(grossSalary - basicSalary)
  const additionalDeductions = options?.additionalDeductions ?? 0

  // Fund contribution
  let epf: EPFResult | null = null
  let ssf: SSFResult | null = null
  let fundEmployeeContribution = 0

  if (companyFundType === 'EPF') {
    epf = calculateEPF(basicSalary)
    fundEmployeeContribution = epf.employeeContribution
  } else {
    ssf = calculateSSF(basicSalary, options?.isContributionBasedSSF)
    fundEmployeeContribution = ssf.employeeContribution
  }

  // Insurance deduction (annual limits, convert to monthly for display)
  const insurance = calculateInsuranceDeduction(
    options?.lifeInsurancePremium,
    options?.healthInsurancePremium,
  )
  const monthlyInsuranceDeduction = Math.round(insurance.total / 12)

  // CIT
  const cit = options?.citRate ? calculateCIT(basicSalary, options.citRate) : null
  const citDeduction = cit?.amount ?? 0

  // Annual taxable income calculation
  // Taxable income = (Gross - Fund Employee Contribution - Insurance) × 12
  const monthlyPreTaxDeductions = fundEmployeeContribution + monthlyInsuranceDeduction + citDeduction + additionalDeductions
  const annualTaxableIncome = Math.round((grossSalary - monthlyPreTaxDeductions) * 12)

  // Income tax
  const taxResult = calculateIncomeTax(Math.max(0, annualTaxableIncome), maritalStatus)

  // Total deductions (monthly)
  const totalDeductions = fundEmployeeContribution + taxResult.monthlyTDS + monthlyInsuranceDeduction + citDeduction + additionalDeductions

  // Net salary
  const netSalary = grossSalary - totalDeductions

  return {
    grossSalary,
    basicSalary,
    allowances,
    companyFundType,
    maritalStatus,
    epf,
    ssf,
    incomeTax: taxResult.totalTax,
    monthlyTDS: taxResult.monthlyTDS,
    insuranceDeduction: monthlyInsuranceDeduction,
    citDeduction,
    totalDeductions,
    netSalary,
    annualTaxableIncome: Math.max(0, annualTaxableIncome),
    annualGrossIncome: grossSalary * 12,
  }
}

/**
 * Calculate full payroll for an employee.
 *
 * Convenience wrapper that combines salary breakdown,
 * gratuity, insurance, CIT, and minimum salary compliance.
 *
 * @param params - Payroll calculation parameters
 * @returns Complete payroll result
 */
export function calculatePayroll(params: PayrollParams): PayrollResult {
  const breakdown = getSalaryBreakdown(
    params.grossSalary,
    params.companyFundType,
    params.maritalStatus,
    {
      basicSalary: params.basicSalary,
      allowances: params.allowances,
      lifeInsurancePremium: params.lifeInsurancePremium,
      healthInsurancePremium: params.healthInsurancePremium,
      citRate: params.citRate,
      isContributionBasedSSF: params.isContributionBasedSSF,
      additionalDeductions: params.additionalDeductions,
    },
  )

  const insurance = calculateInsuranceDeduction(
    params.lifeInsurancePremium,
    params.healthInsurancePremium,
  )

  const cit = params.citRate
    ? calculateCIT(breakdown.basicSalary, params.citRate)
    : { amount: 0, citRate: 0, taxRebate: 0 }

  const minimumSalaryCompliance = validateMinimumSalary(breakdown.basicSalary)

  return {
    breakdown,
    gratuity: null, // Gratuity needs yearsOfService; caller should use calculateGratuity() directly
    insurance,
    cit,
    minimumSalaryCompliance,
  }
}
