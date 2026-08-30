/**
 * React hook for the Asset Operations view.
 */
import { useMemo, useCallback } from "react";
import { useFixedAssets } from "@/hooks/useFixedAssets";
import { toast } from "sonner";
import {
  type AssetForOperations,
  type AssetSummary,
  selectActiveAssets,
  computeAssetSummary,
  calculateDepreciation,
  getBookValue,
} from "@/lib/finance/assetOperationsService";

export interface UseAssetOperationsViewReturn {
  assets: AssetForOperations[];
  activeAssets: AssetForOperations[];
  isLoading: boolean;
  summary: AssetSummary;
  getMonthlyDepreciation: (asset: AssetForOperations) => number;
  getAssetBookValue: (asset: AssetForOperations) => number;
  runDepreciation: () => Promise<void>;
  isRunningDepreciation: boolean;
}

export function useAssetOperationsView(): UseAssetOperationsViewReturn {
  const { data: assets, isLoading, runDepreciation: runDep, calculateDepreciation: hookCalcDep } = useFixedAssets();

  const assetList = (assets || []) as unknown as AssetForOperations[];
  const activeAssets = useMemo(() => selectActiveAssets(assetList), [assetList]);
  const summary = useMemo(() => computeAssetSummary(assetList), [assetList]);

  const getMonthlyDepreciation = useCallback(
    (asset: AssetForOperations) => calculateDepreciation(asset),
    []
  );

  const getAssetBookValue = useCallback(
    (asset: AssetForOperations) => getBookValue(asset),
    []
  );

  const runDepreciation = useCallback(async () => {
    try {
      const count = await runDep.mutateAsync();
      toast.success(`Depreciation run completed for ${count} assets`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [runDep]);

  return {
    assets: assetList,
    activeAssets,
    isLoading,
    summary,
    getMonthlyDepreciation,
    getAssetBookValue,
    runDepreciation,
    isRunningDepreciation: runDep.isPending,
  };
}
