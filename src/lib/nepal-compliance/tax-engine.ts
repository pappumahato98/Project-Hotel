/**
 * Nepal Income Tax Calculation Engine
 *
 * Implements income tax slabs per Income Tax Act 2058 BS
 * as applicable for FY 2081/82 BS (current fiscal year).
 *
 * Two filing statuses:
 *   - 'married'    — Married filing jointly
 *   - 'unmarried'  — Individual / unmarried
 *
 * All amounts in NPR (Nepalese Rupees).
 */

// ── Types ─────────────────────────────────────────────────────────────

/** Marital status for tax calculation */
export type MaritalStatus = 'married' | 'unmarried'

/** A single tax slab band */
export interface TaxSlab {
  /** Slab label (e.g. '1st slab') */
  label: string
  /** Lower bound of this slab (inclusive), NPR */
  from: number
  /** Upper bound of this slab (inclusive), NPR. 0 = no upper limit */
  to: number
  /** Tax rate for this slab, percentage */
  rate: number
}

/** Tax computation for one slab */
export interface SlabComputation {
  /** The slab definition */
  slab: TaxSlab
  /** Taxable amount that falls within this slab */
  taxableInSlab: number
  /** Tax payable for this slab */
  taxInSlab: number
  /** Cumulative tax up to and including this slab */
  cumulativeTax: number
}

/** Full income tax calculation result */
export interface IncomeTaxResult {
  /** Detailed slab-by-slab computation */
  slabs: SlabComputation[]
  /** Total annual income tax payable, NPR */
  totalTax: number
  /** Effective tax rate (totalTax / annualTaxableIncome * 100) */
  effectiveRate: number
  /** Monthly TDS deduction amount */
  monthlyTDS: number
}

/** Tax bracket info for a given income */
export interface TaxBracketInfo {
  /** The slab the income falls into */
  slab: TaxSlab
  /** Tax amount within the current slab */
  taxInSlab: number
  /** Cumulative tax up to the current slab */
  cumulativeTax: number
}

// ── Tax Slab Data (FY 2081/82 BS) ─────────────────────────────────────

/** Married filing jointly — income tax slabs */
const MARRIED_SLABS: TaxSlab[] = [
  { label: '1st slab', from: 1,          to: 600_000,     rate: 1 },
  { label: '2nd slab', from: 600_001,    to: 800_000,     rate: 10 },
  { label: '3rd slab', from: 800_001,    to: 1_100_000,   rate: 20 },
  { label: '4th slab', from: 1_100_001,  to: 2_000_000,   rate: 30 },
  { label: '5th slab', from: 2_000_001,  to: 5_000_000,   rate: 36 },
  { label: '6th slab', from: 5_000_001,  to: 0,           rate: 39 },
]

/** Unmarried / individual — income tax slabs */
const UNMARRIED_SLABS: TaxSlab[] = [
  { label: '1st slab', from: 1,          to: 500_000,     rate: 1 },
  { label: '2nd slab', from: 500_001,    to: 700_000,     rate: 10 },
  { label: '3rd slab', from: 700_001,    to: 1_000_000,   rate: 20 },
  { label: '4th slab', from: 1_000_001,  to: 2_000_000,   rate: 30 },
  { label: '5th slab', from: 2_000_001,  to: 5_000_000,   rate: 36 },
  { label: '6th slab', from: 5_000_001,  to: 0,           rate: 39 },
]

// ── Exported Functions ────────────────────────────────────────────────

/**
 * Get the tax slab table for a given marital status.
 *
 * @param maritalStatus - 'married' or 'unmarried'
 * @returns Array of TaxSlab definitions for the given filing status
 */
export function getTaxSlabs(maritalStatus: MaritalStatus): TaxSlab[] {
  return maritalStatus === 'married' ? [...MARRIED_SLABS] : [...UNMARRIED_SLABS]
}

/**
 * Calculate Nepal income tax on annual taxable income.
 *
 * Returns slab-by-slab breakdown, total tax, effective rate,
 * and monthly TDS amount.
 *
 * @param annualTaxableIncome - Annual taxable income in NPR
 * @param maritalStatus - 'married' or 'unmarried'
 * @returns Full income tax computation result
 */
export function calculateIncomeTax(
  annualTaxableIncome: number,
  maritalStatus: MaritalStatus,
): IncomeTaxResult {
  const slabs = getTaxSlabs(maritalStatus)
  const computations: SlabComputation[] = []
  let remaining = Math.max(0, Math.round(annualTaxableIncome))
  let cumulativeTax = 0

  for (const slab of slabs) {
    if (remaining <= 0) {
      // Income exhausted — no tax in remaining slabs
      computations.push({
        slab,
        taxableInSlab: 0,
        taxInSlab: 0,
        cumulativeTax,
      })
      continue
    }

    // Width of this slab (0 means unbounded)
    const slabWidth = slab.to === 0 ? Infinity : slab.to - slab.from + 1
    const taxableInSlab = Math.min(remaining, slabWidth)
    const taxInSlab = Math.round(taxableInSlab * (slab.rate / 100))
    cumulativeTax += taxInSlab
    remaining -= taxableInSlab

    computations.push({
      slab,
      taxableInSlab,
      taxInSlab,
      cumulativeTax,
    })
  }

  const totalTax = cumulativeTax
  const effectiveRate =
    annualTaxableIncome > 0
      ? Math.round((totalTax / annualTaxableIncome) * 100 * 100) / 100
      : 0

  return {
    slabs: computations,
    totalTax,
    effectiveRate,
    monthlyTDS: Math.round(totalTax / 12),
  }
}

/**
 * Get tax bracket info for a given annual income.
 *
 * Identifies which slab the income falls into and returns
 * the tax in that slab and cumulative tax.
 *
 * @param annualIncome - Annual income in NPR
 * @param maritalStatus - 'married' or 'unmarried'
 * @returns Tax bracket information for the applicable slab
 */
export function getTaxBracketInfo(
  annualIncome: number,
  maritalStatus: MaritalStatus,
): TaxBracketInfo {
  const result = calculateIncomeTax(annualIncome, maritalStatus)
  // Find the last slab with a non-zero taxable amount
  const activeSlab = [...result.slabs].reverse().find((s) => s.taxableInSlab > 0)

  if (!activeSlab) {
    return {
      slab: result.slabs[0].slab,
      taxInSlab: 0,
      cumulativeTax: 0,
    }
  }

  return {
    slab: activeSlab.slab,
    taxInSlab: activeSlab.taxInSlab,
    cumulativeTax: activeSlab.cumulativeTax,
  }
}
