import { describe, expect, it } from "vitest";
import {
  Actor,
  add,
  assertBalanced,
  cancelOrder,
  confirmPayouts,
  createBatch,
  createOrder,
  emptyState,
  feeFor,
  fundOrder,
  getMarketSummary,
  matchOrders,
  Order,
  parseUsd,
  reconcileBatch,
  reviewOrder,
  reviewOrganization,
  runMatching,
  seedDemo,
  State,
  viewFor,
} from "./index";
const admin: Actor = { id: "admin", role: "ADMIN" },
  at = "2026-09-24T12:00:00Z";
function seeded() {
  const s = emptyState();
  seedDemo(s, admin, at);
  return s;
}
function close(s: State) {
  runMatching(s, admin, at);
  const b = createBatch(s, admin, at)!;
  confirmPayouts(s, admin, b.id, at);
  reconcileBatch(s, admin, b.id, at);
  return b;
}
function order(id: string, side: Order["side"], amountMinor: number): Order {
  return {
    id,
    organizationId: id,
    side,
    amountMinor,
    matchedMinor: 0,
    settledMinor: 0,
    feeBps: 400,
    status: "OPEN",
    purposeCode: "SUPPLIER_PAYMENT",
    createdAt: at,
  };
}
describe("money and ledger invariants", () => {
  it.each([
    ["1000.01", 100001],
    ["0.10", 10],
    ["1000000", 100000000],
  ])("parses %s without floating-point multiplication", (value, expected) =>
    expect(parseUsd(value)).toBe(expected),
  );
  it.each(["-1", "NaN", "Infinity", "1e6", "1.001", "", "0x10", "1,000"])(
    "rejects malformed amount %s",
    (value) => expect(() => parseUsd(value)).toThrow(),
  );
  it("preserves cents in fees with half-up integer rounding", () => {
    expect(feeFor(100013, 400)).toBe(4001);
    expect(feeFor(1, 500)).toBe(0);
    expect(() => add(Number.MAX_SAFE_INTEGER, 1)).toThrow();
  });
  it("accepts balanced nonzero double-entry journals", () =>
    expect(
      assertBalanced([
        { account: "cash", debitMinor: 100, creditMinor: 0 },
        { account: "liability", debitMinor: 0, creditMinor: 100 },
      ]),
    ).toBe(true));
  it.each(
    [
      [],
      [{ account: "x", debitMinor: -1, creditMinor: -1 }],
      [
        { account: "x", debitMinor: 0.5, creditMinor: 0 },
        { account: "y", debitMinor: 0, creditMinor: 0.5 },
      ],
      [
        { account: "x", debitMinor: 1, creditMinor: 1 },
        { account: "y", debitMinor: 1, creditMinor: 1 },
      ],
      [
        { account: "x", debitMinor: 1, creditMinor: 0 },
        { account: "y", debitMinor: 0, creditMinor: 2 },
      ],
    ].map((lines) => ({ lines })),
  )("rejects invalid ledger lines", ({ lines }) =>
    expect(() => assertBalanced(lines)).toThrow(),
  );
});
describe("matching regressions", () => {
  it("keeps all five $500k allocations across repeated runs", () => {
    const s = seeded();
    expect(runMatching(s, admin, at)).toHaveLength(5);
    const before = JSON.stringify(s);
    expect(runMatching(s, admin, at)).toEqual([]);
    expect(JSON.stringify(s)).toBe(before);
    expect(s.allocations.reduce((n, a) => n + a.amountMinor, 0)).toBe(50000000);
  });
  it("accumulates partial fills when new liquidity arrives", () => {
    const s = emptyState();
    s.orders = [
      order("a", "NEED_US_SETTLEMENT", 300000),
      order("b", "NEED_CUBA_LIQUIDITY", 100000),
    ];
    runMatching(s, admin, at);
    s.orders.push(order("c", "NEED_CUBA_LIQUIDITY", 200000));
    runMatching(s, admin, at);
    expect(s.orders[0].matchedMinor).toBe(300000);
    expect(s.allocations).toHaveLength(2);
    expect(new Set(s.allocations.map((a) => a.id)).size).toBe(2);
  });
  it("excludes non-open states and self-matches", () => {
    const a = order("a", "NEED_US_SETTLEMENT", 100000),
      b = order("b", "NEED_CUBA_LIQUIDITY", 100000);
    b.organizationId = "a";
    expect(matchOrders([a, b])).toEqual([]);
    b.organizationId = "b";
    b.status = "SETTLED";
    expect(matchOrders([a, b])).toEqual([]);
    expect(getMarketSummary([a, b]).needCuba).toBe(0);
  });
  it("uses stable ID order for equal timestamps", () => {
    const orders = [
      order("z", "NEED_US_SETTLEMENT", 100000),
      order("a", "NEED_US_SETTLEMENT", 100000),
      order("b", "NEED_CUBA_LIQUIDITY", 100000),
    ];
    expect(matchOrders(orders)[0].leftOrderId).toBe("a");
    expect(orders[0].matchedMinor).toBe(0);
  });
});
describe("settlement and reconciliation", () => {
  it("requires confirmed instructions before closing", () => {
    const s = seeded();
    runMatching(s, admin, at);
    const b = createBatch(s, admin, at)!;
    const before = JSON.stringify(s);
    expect(() => reconcileBatch(s, admin, b.id, at)).toThrow(
      "PAYOUTS_NOT_RECONCILED",
    );
    expect(JSON.stringify(s)).toBe(before);
  });
  it("closes exactly once and never batches settled allocations again", () => {
    const s = seeded(),
      b = close(s);
    const before = JSON.stringify(s);
    confirmPayouts(s, admin, b.id, at);
    reconcileBatch(s, admin, b.id, at);
    expect(createBatch(s, admin, at)).toBeNull();
    runMatching(s, admin, at);
    seedDemo(s, admin, at);
    expect(JSON.stringify(s)).toBe(before);
    expect(s.orders.every((o) => o.status === "SETTLED")).toBe(true);
    expect(s.journals).toHaveLength(16);
    for (const j of s.journals) expect(assertBalanced(j.lines)).toBe(true);
  });
  it("rejects mismatched payout receipts", () => {
    const s = seeded();
    runMatching(s, admin, at);
    const b = createBatch(s, admin, at)!;
    expect(() =>
      confirmPayouts(s, admin, b.id, at, {
        mode: "SIMULATION",
        confirm: () => ({ reference: "bad", amountMinor: 1, currency: "USD" }),
      }),
    ).toThrow("PAYOUT_MISMATCH");
  });
  it("rejects missing legs and duplicate references", () => {
    const s = seeded();
    runMatching(s, admin, at);
    const b = createBatch(s, admin, at)!;
    confirmPayouts(s, admin, b.id, at);
    b.instructions[1].providerReference = b.instructions[0].providerReference;
    expect(() => reconcileBatch(s, admin, b.id, at)).toThrow(
      "DUPLICATE_PROVIDER_REFERENCE",
    );
    b.instructions.pop();
    expect(() => reconcileBatch(s, admin, b.id, at)).toThrow("INVALID_BATCH");
  });
  it("settles an order through two batches and charges the total fee exactly once", () => {
    const s = emptyState();
    const a = order("a", "NEED_US_SETTLEMENT", 300013),
      b = order("b", "NEED_CUBA_LIQUIDITY", 100001);
    for (const o of [a, b]) {
      o.status = "AWAITING_FUNDING";
      s.orders.push(o);
      fundOrder(s, admin, o.id, at);
    }
    close(s);
    expect(a.settledMinor).toBe(100001);
    expect(a.status).toBe("PARTIALLY_MATCHED");
    const c = order("c", "NEED_CUBA_LIQUIDITY", 200012);
    c.status = "AWAITING_FUNDING";
    s.orders.push(c);
    fundOrder(s, admin, c.id, at);
    close(s);
    expect(a.status).toBe("SETTLED");
    expect(a.settledMinor).toBe(a.amountMinor);
    const balance = s.journals
      .flatMap((j) => j.lines)
      .filter((l) => l.account === "liability:a")
      .reduce((n, l) => n + l.creditMinor - l.debitMinor, 0);
    expect(balance).toBe(0);
  });
});
describe("authorization and workflow", () => {
  const business: Actor = { id: "u", role: "BUSINESS", organizationId: "org" };
  function organization(s: State) {
    s.organizations.push({
      id: "org",
      legalName: "Demo",
      country: "CU",
      registrationNo: "x",
      taxId: "x",
      ownerName: "x",
      sourceOfFunds: "x",
      status: "KYB_PENDING",
      createdAt: at,
    });
  }
  it("does not allow businesses to approve themselves or operate settlement", () => {
    const s = emptyState();
    organization(s);
    expect(() => reviewOrganization(s, business, "org", true, at)).toThrow(
      "FORBIDDEN",
    );
    expect(() => runMatching(s, business, at)).toThrow("FORBIDDEN");
    expect(() => seedDemo(s, business, at)).toThrow("FORBIDDEN");
  });
  it("requires KYB, review and funding, and deduplicates order submissions", () => {
    const s = emptyState();
    organization(s);
    const input = {
      side: "NEED_US_SETTLEMENT" as const,
      amount: "1000.01",
      purposeCode: "SUPPLIER_PAYMENT",
      requestId: "request-0123456789",
    };
    expect(() => createOrder(s, business, input, at)).toThrow("KYB_REQUIRED");
    reviewOrganization(s, admin, "org", true, at);
    const o = createOrder(s, business, input, at);
    expect(() => fundOrder(s, admin, o.id, at)).toThrow(
      "INVALID_STATE_TRANSITION",
    );
    reviewOrder(s, admin, o.id, true, at);
    fundOrder(s, admin, o.id, at);
    fundOrder(s, admin, o.id, at);
    expect(s.journals).toHaveLength(1);
    createOrder(s, business, input, at);
    expect(s.orders).toHaveLength(1);
    expect(() =>
      createOrder(s, business, { ...input, amount: "2000" }, at),
    ).toThrow("IDEMPOTENCY_CONFLICT");
    expect(() => cancelOrder(s, business, o.id, at)).toThrow(
      "CANNOT_CANCEL_FUNDED_ORDER",
    );
  });
  it("does not disclose counterparts, sessions, credentials or private company data", () => {
    const s = seeded();
    close(s);
    s.users.push({
      id: "secret-user",
      email: "private@example.test",
      passwordHash: "secret-hash",
      organizationId: "demo-org-2",
    });
    const view = viewFor(s, {
      id: "customer",
      role: "BUSINESS",
      organizationId: "demo-org-1",
    });
    expect(view.orders).toHaveLength(1);
    expect(view.organizations).toHaveLength(1);
    expect(view.allocations).toEqual([]);
    const json = JSON.stringify(view);
    expect(json).not.toContain("demo-org-2");
    expect(json).not.toContain("secret-hash");
    expect(json).not.toContain("leftOrderId");
  });
});
