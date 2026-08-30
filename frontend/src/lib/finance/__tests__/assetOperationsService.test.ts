/**
 * Unit tests for assetOperationsService.
 */
import { describe, it, expect } from "vitest";
import {
  calculateDepreciation,
  selectActiveAssets,
  computeAssetSummary,
  getBookValue,
  formatDollar,
  type AssetForOperations,
} from "../assetOperationsService";

const assets: AssetForOperations[] = [
  { id: "a1", asset_number: "AST-001", name: "Truck", status: "active", cost: 60000, accumulated_depreciation: 12000, depreciation_method: "straight_line", useful_life_years: 5, salvage_value: 0 },
  { id: "a2", asset_number: "AST-002", name: "Building", status: "active", cost: 500000, accumulated_depreciation: 100000, depreciation_method: "straight_line", useful_life_years: 50, salvage_value: 0 },
  { id: "a3", asset_number: "AST-003", name: "Old PC", status: "disposed", cost: 2000, accumulated_depreciation: 2000, depreciation_method: "straight_line", useful_life_years: 4, salvage_value: 0 },
];

describe("calculateDepreciation", () => {
  it("calculates straight-line monthly depreciation", () => {
    // Truck: 60000 / (5 * 12) = 1000/month
    expect(calculateDepreciation(assets[0])).toBeCloseTo(1000, 2);
  });

  it("returns 0 for 0 useful_life_years", () => {
    expect(calculateDepreciation({ ...assets[0], useful_life_years: 0 })).toBe(0);
  });

  it("subtracts salvage value from cost", () => {
    const asset = { ...assets[0], cost: 60000, salvage_value: 10000, useful_life_years: 5 };
    // (60000 - 10000) / 60 = 833.33
    expect(calculateDepreciation(asset)).toBeCloseTo(833.33, 2);
  });
});

describe("selectActiveAssets", () => {
  it("filters out non-active assets", () => {
    const active = selectActiveAssets(assets);
    expect(active).toHaveLength(2);
    expect(active.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});

describe("computeAssetSummary", () => {
  it("computes counts and totals", () => {
    const summary = computeAssetSummary(assets);
    expect(summary.activeCount).toBe(2);
    expect(summary.totalMonthlyDepreciation).toBeCloseTo(1833.33, 2); // 1000 + 833.33
    expect(summary.totalAccumulatedDepreciation).toBe(114000); // 12000 + 100000 + 2000
  });

  it("handles empty array", () => {
    const summary = computeAssetSummary([]);
    expect(summary).toEqual({ activeCount: 0, totalMonthlyDepreciation: 0, totalAccumulatedDepreciation: 0 });
  });
});

describe("getBookValue", () => {
  it("calculates cost minus accumulated depreciation", () => {
    expect(getBookValue(assets[0])).toBe(48000); // 60000 - 12000
  });

  it("handles undefined values as 0", () => {
    expect(getBookValue({ ...assets[0], cost: undefined as unknown as number, accumulated_depreciation: undefined as unknown as number })).toBe(0);
  });
});

describe("formatDollar", () => {
  it("formats with 2 decimals", () => {
    expect(formatDollar(1000)).toBe("$1,000.00");
    expect(formatDollar(99.999)).toBe("$100.00");
  });
});
