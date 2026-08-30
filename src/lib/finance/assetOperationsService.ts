/**
 * Pure business-logic layer for the Asset Operations view.
 */

export interface AssetForOperations {
  id: string;
  asset_number: string;
  name: string;
  status: string;
  cost: number;
  accumulated_depreciation: number;
  depreciation_method: string;
  useful_life_years: number;
  salvage_value: number;
}

export interface AssetSummary {
  activeCount: number;
  totalMonthlyDepreciation: number;
  totalAccumulatedDepreciation: number;
}

/**
 * Calculate monthly depreciation for a single asset using straight-line method.
 * (cost - salvage_value) / (useful_life_years * 12)
 */
export function calculateDepreciation(asset: AssetForOperations): number {
  if (asset.useful_life_years <= 0) return 0;
  const depreciableBase = asset.cost - (asset.salvage_value || 0);
  return depreciableBase / (asset.useful_life_years * 12);
}

/**
 * Filter assets to only those with status "active".
 */
export function selectActiveAssets(assets: AssetForOperations[]): AssetForOperations[] {
  return assets.filter((a) => a.status === "active");
}

/**
 * Compute the high-level asset summary.
 */
export function computeAssetSummary(assets: AssetForOperations[]): AssetSummary {
  const active = selectActiveAssets(assets);
  const totalMonthlyDepreciation = active.reduce((s, a) => s + calculateDepreciation(a), 0);
  const totalAccumulatedDepreciation = assets.reduce((s, a) => s + (a.accumulated_depreciation || 0), 0);
  return {
    activeCount: active.length,
    totalMonthlyDepreciation,
    totalAccumulatedDepreciation,
  };
}

/**
 * Calculate the book value of an asset (cost - accumulated_depreciation).
 */
export function getBookValue(asset: AssetForOperations): number {
  return (asset.cost || 0) - (asset.accumulated_depreciation || 0);
}

/**
 * Format a number as a dollar string.
 */
export function formatDollar(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
