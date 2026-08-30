/**
 * Unit tests for financialPeriodCloseService.
 */
import { describe, it, expect } from "vitest";
import {
  computeNextBusinessDate,
  canCloseDay,
  formatCloseSuccessMessage,
} from "../financialPeriodCloseService";

describe("computeNextBusinessDate", () => {
  it("increments by one day", () => {
    expect(computeNextBusinessDate("2025-01-15")).toBe("2025-01-16");
  });

  it("handles month boundary", () => {
    expect(computeNextBusinessDate("2025-01-31")).toBe("2025-02-01");
  });

  it("handles year boundary", () => {
    expect(computeNextBusinessDate("2025-12-31")).toBe("2026-01-01");
  });

  it("handles leap year", () => {
    expect(computeNextBusinessDate("2024-02-28")).toBe("2024-02-29");
  });
});

describe("canCloseDay", () => {
  it("returns true for a valid date string", () => {
    expect(canCloseDay("2025-01-15")).toBe(true);
  });

  it("returns false for null", () => {
    expect(canCloseDay(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(canCloseDay(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(canCloseDay("")).toBe(false);
  });
});

describe("formatCloseSuccessMessage", () => {
  it("includes the next date in the message", () => {
    const msg = formatCloseSuccessMessage("2025-01-16");
    expect(msg).toContain("2025-01-16");
    expect(msg).toContain("Business day closed");
  });
});
