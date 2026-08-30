/**
 * Pure business-logic layer for the Financial Period Close view.
 *
 * Extracted from src/components/finance/transactions/FinancialPeriodCloseService.tsx
 * as the ninth worked example of the finance-service-split pattern.
 */

/**
 * Compute the next business date by incrementing the current date by one day.
 *
 * @param currentDate ISO date string (YYYY-MM-DD)
 * @returns ISO date string for the next day
 */
export function computeNextBusinessDate(currentDate: string): string {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/**
 * Determine if the day-close can proceed (requires a valid business date).
 */
export function canCloseDay(businessDate: string | null | undefined): boolean {
  return !!businessDate;
}

/**
 * Format the close confirmation message for the toast.
 */
export function formatCloseSuccessMessage(nextDate: string): string {
  return `Business day closed. New date: ${nextDate}`;
}
