import { describe, expect, it } from "vitest";
import { assertBalanced, assertOrderTransition, demoOrders, matchOrders } from "./index";

describe("matching", () => {
  it("matches the full $500k book with partial fills", () => {
    const allocations = matchOrders(demoOrders);
    expect(allocations.reduce((sum, item) => sum + item.amountMinor, 0)).toBe(500_000_00);
    expect(allocations.length).toBeGreaterThanOrEqual(5);
  });
});

describe("ledger", () => {
  it("accepts balanced entries", () => {
    expect(assertBalanced([
      { account: "cash", debitMinor: 10000, creditMinor: 0 },
      { account: "customer-liability", debitMinor: 0, creditMinor: 10000 }
    ])).toBe(true);
  });

  it("rejects unbalanced entries", () => {
    expect(() => assertBalanced([
      { account: "cash", debitMinor: 10000, creditMinor: 0 }
    ])).toThrow("UNBALANCED_JOURNAL_ENTRY");
  });
});

describe("order workflow", () => {
  it("does not allow bypassing compliance", () => {
    expect(() => assertOrderTransition("SUBMITTED", "OPEN")).toThrow("INVALID_STATE_TRANSITION");
  });
});
