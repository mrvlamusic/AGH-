/** Pure sandbox domain. All monetary values are integer cents. */
export type Side = "NEED_US_SETTLEMENT" | "NEED_CUBA_LIQUIDITY";
export type Status =
  | "COMPLIANCE_REVIEW"
  | "AWAITING_FUNDING"
  | "OPEN"
  | "PARTIALLY_MATCHED"
  | "FULLY_MATCHED"
  | "SETTLEMENT_PENDING"
  | "SETTLED"
  | "CANCELLED"
  | "REJECTED";
export type Actor = {
  id: string;
  role: "ADMIN" | "BUSINESS";
  organizationId?: string;
};
export type Organization = {
  id: string;
  legalName: string;
  registrationNo: string;
  taxId: string;
  ownerName: string;
  sourceOfFunds: string;
  country: string;
  status: "KYB_PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
};
export type Order = {
  id: string;
  organizationId: string;
  side: Side;
  amountMinor: number;
  matchedMinor: number;
  settledMinor: number;
  feeBps: number;
  purposeCode: string;
  status: Status;
  createdAt: string;
};
export type Allocation = {
  id: string;
  leftOrderId: string;
  rightOrderId: string;
  amountMinor: number;
  batchId?: string;
};
export type Instruction = {
  id: string;
  allocationId: string;
  orderId: string;
  side: "CUBA" | "USA";
  amountMinor: number;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  providerReference?: string;
  confirmedAmountMinor?: number;
  currency?: string;
};
export type Batch = {
  id: string;
  createdAt: string;
  status: "OPEN" | "CLOSED";
  instructions: Instruction[];
  closedAt?: string;
};
export type LedgerLine = {
  account: string;
  debitMinor: number;
  creditMinor: number;
};
export type Journal = {
  reference: string;
  createdAt: string;
  lines: LedgerLine[];
};
export type Audit = {
  id: string;
  at: string;
  actorId: string;
  action: string;
  entityId: string;
  organizationId?: string;
  detail: string;
};
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  organizationId: string;
};
export type Session = { tokenHash: string; actor: Actor; expiresAt: number };
export type Invite = {
  id: string;
  tokenHash: string;
  expiresAt: number;
  usedAt?: string;
};
export type State = {
  version: 1;
  organizations: Organization[];
  orders: Order[];
  allocations: Allocation[];
  batches: Batch[];
  journals: Journal[];
  audit: Audit[];
  users: User[];
  sessions: Session[];
  invites: Invite[];
  attempts: Record<string, { count: number; until: number }>;
};
export class DomainError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function ensure(
  condition: unknown,
  code: string,
  status = 400,
): asserts condition {
  if (!condition) throw new DomainError(code, status);
}
export function minor(value: number) {
  ensure(Number.isSafeInteger(value) && value >= 0, "INVALID_MONEY");
  return value;
}
export function add(a: number, b: number) {
  return minor(minor(a) + minor(b));
}
export function parseUsd(text: string): number {
  ensure(/^\d{1,10}(\.\d{1,2})?$/.test(text), "INVALID_AMOUNT");
  const [whole, fraction = ""] = text.split(".");
  return minor(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
export function feeFor(amount: number, bps: number) {
  minor(amount);
  ensure(Number.isInteger(bps) && bps >= 300 && bps <= 500, "INVALID_FEE");
  return Number((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
}
export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}
export function assertBalanced(lines: LedgerLine[]) {
  ensure(lines.length >= 2, "EMPTY_JOURNAL");
  let debit = 0,
    credit = 0;
  for (const line of lines) {
    minor(line.debitMinor);
    minor(line.creditMinor);
    ensure(
      !!line.account &&
        ((line.debitMinor > 0 && line.creditMinor === 0) ||
          (line.creditMinor > 0 && line.debitMinor === 0)),
      "INVALID_LEDGER_LINE",
    );
    debit = add(debit, line.debitMinor);
    credit = add(credit, line.creditMinor);
  }
  ensure(debit === credit, "UNBALANCED_JOURNAL_ENTRY");
  return true;
}
export function recordJournal(
  state: State,
  reference: string,
  lines: LedgerLine[],
  at: string,
) {
  assertBalanced(lines);
  const prior = state.journals.find((j) => j.reference === reference);
  if (prior) {
    ensure(
      JSON.stringify(prior.lines) === JSON.stringify(lines),
      "JOURNAL_CONFLICT",
    );
    return;
  }
  state.journals.push({ reference, createdAt: at, lines });
}
export function audit(
  state: State,
  actor: Actor,
  action: string,
  entityId: string,
  detail: string,
  at: string,
  organizationId?: string,
) {
  state.audit.push({
    id: "EV-" + (state.audit.length + 1),
    at,
    actorId: actor.id,
    action,
    entityId,
    detail,
    organizationId,
  });
}
function admin(actor: Actor) {
  ensure(actor.role === "ADMIN", "FORBIDDEN", 403);
}
function orderById(state: State, id: string) {
  const o = state.orders.find((o) => o.id === id);
  ensure(o, "ORDER_NOT_FOUND", 404);
  return o;
}
export const PURPOSES = [
  "SUPPLIER_PAYMENT",
  "IMPORT_PAYMENT",
  "SERVICE_PAYMENT",
  "INVOICE_SETTLEMENT",
] as const;
export function createOrder(
  state: State,
  actor: Actor,
  input: { side: Side; amount: string; purposeCode: string; requestId: string },
  at: string,
) {
  ensure(actor.role === "BUSINESS" && actor.organizationId, "FORBIDDEN", 403);
  const org = state.organizations.find((o) => o.id === actor.organizationId);
  ensure(org?.status === "VERIFIED", "KYB_REQUIRED", 403);
  ensure(/^[a-zA-Z0-9-]{16,64}$/.test(input.requestId), "INVALID_REQUEST_ID");
  const amountMinor = parseUsd(input.amount);
  ensure(amountMinor >= 100_000 && amountMinor <= 100_000_000, "AMOUNT_RANGE");
  ensure(
    input.side === "NEED_US_SETTLEMENT" || input.side === "NEED_CUBA_LIQUIDITY",
    "INVALID_SIDE",
  );
  ensure(
    PURPOSES.includes(input.purposeCode as (typeof PURPOSES)[number]),
    "INVALID_PURPOSE",
  );
  const id = "CP-" + actor.organizationId + "-" + input.requestId;
  const prior = state.orders.find((o) => o.id === id);
  if (prior) {
    ensure(
      prior.amountMinor === amountMinor &&
        prior.side === input.side &&
        prior.purposeCode === input.purposeCode,
      "IDEMPOTENCY_CONFLICT",
      409,
    );
    return prior;
  }
  const order: Order = {
    id,
    organizationId: actor.organizationId,
    side: input.side,
    amountMinor,
    matchedMinor: 0,
    settledMinor: 0,
    feeBps: 400,
    purposeCode: input.purposeCode,
    status: "COMPLIANCE_REVIEW",
    createdAt: at,
  };
  state.orders.push(order);
  audit(
    state,
    actor,
    "ORDER_SUBMITTED",
    id,
    "Orden enviada a revisión",
    at,
    org.id,
  );
  return order;
}
export function reviewOrganization(
  state: State,
  actor: Actor,
  id: string,
  approved: boolean,
  at: string,
) {
  admin(actor);
  const org = state.organizations.find((o) => o.id === id);
  ensure(org, "ORGANIZATION_NOT_FOUND", 404);
  const next = approved ? "VERIFIED" : "REJECTED";
  if (org.status === next) return;
  ensure(org.status === "KYB_PENDING", "INVALID_STATE_TRANSITION", 409);
  org.status = next;
  audit(
    state,
    actor,
    approved ? "KYB_APPROVED" : "KYB_REJECTED",
    id,
    "Revisión KYB de simulación",
    at,
    id,
  );
}
export function reviewOrder(
  state: State,
  actor: Actor,
  id: string,
  approved: boolean,
  at: string,
) {
  admin(actor);
  const order = orderById(state, id);
  const next = approved ? "AWAITING_FUNDING" : "REJECTED";
  if (order.status === next) return;
  ensure(order.status === "COMPLIANCE_REVIEW", "INVALID_STATE_TRANSITION", 409);
  order.status = next;
  audit(
    state,
    actor,
    approved ? "ORDER_APPROVED" : "ORDER_REJECTED",
    id,
    "Revisión operativa sandbox",
    at,
    order.organizationId,
  );
}
export function fundOrder(state: State, actor: Actor, id: string, at: string) {
  admin(actor);
  const order = orderById(state, id);
  if (state.journals.some((j) => j.reference === "fund:" + id)) return;
  ensure(order.status === "AWAITING_FUNDING", "INVALID_STATE_TRANSITION", 409);
  const total = add(order.amountMinor, feeFor(order.amountMinor, order.feeBps));
  recordJournal(
    state,
    "fund:" + id,
    [
      { account: "sandbox:clearing", debitMinor: total, creditMinor: 0 },
      { account: "liability:" + order.id, debitMinor: 0, creditMinor: total },
    ],
    at,
  );
  order.status = "OPEN";
  audit(
    state,
    actor,
    "SANDBOX_FUNDED",
    id,
    "Fondos simulados: " + formatUsd(total) + ", comisión incluida",
    at,
    order.organizationId,
  );
}
export function cancelOrder(
  state: State,
  actor: Actor,
  id: string,
  at: string,
) {
  const order = orderById(state, id);
  ensure(
    actor.role === "ADMIN" || actor.organizationId === order.organizationId,
    "FORBIDDEN",
    403,
  );
  if (order.status === "CANCELLED") return;
  ensure(
    order.status === "COMPLIANCE_REVIEW" || order.status === "AWAITING_FUNDING",
    "CANNOT_CANCEL_FUNDED_ORDER",
    409,
  );
  order.status = "CANCELLED";
  audit(
    state,
    actor,
    "ORDER_CANCELLED",
    id,
    "Orden cancelada antes del fondeo",
    at,
    order.organizationId,
  );
}
const eligible = (o: Order) =>
  o.status === "OPEN" || o.status === "PARTIALLY_MATCHED";
export function getMarketSummary(orders: Order[]) {
  const total = (side: Side) =>
    orders
      .filter((o) => eligible(o) && o.side === side)
      .reduce((s, o) => add(s, o.amountMinor - o.matchedMinor), 0);
  const needUs = total("NEED_US_SETTLEMENT"),
    needCuba = total("NEED_CUBA_LIQUIDITY");
  return {
    needUs,
    needCuba,
    matchable: matchOrders(orders).reduce((s, a) => add(s, a.amountMinor), 0),
    imbalance: Math.abs(needUs - needCuba),
  };
}
export function matchOrders(orders: Order[]): Allocation[] {
  const sorted = orders
    .filter(eligible)
    .map((o) => {
      minor(o.amountMinor);
      minor(o.matchedMinor);
      ensure(o.amountMinor >= o.matchedMinor, "INVALID_ORDER_BALANCE");
      return { ...o };
    })
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  const left = sorted.filter((o) => o.side === "NEED_US_SETTLEMENT"),
    right = sorted.filter((o) => o.side === "NEED_CUBA_LIQUIDITY");
  const allocations: Allocation[] = [];
  for (const l of left)
    for (const r of right) {
      if (l.organizationId === r.organizationId) continue;
      const amount = Math.min(
        l.amountMinor - l.matchedMinor,
        r.amountMinor - r.matchedMinor,
      );
      if (amount <= 0) continue;
      allocations.push({
        id:
          "AL-" +
          l.id +
          "-" +
          l.matchedMinor +
          "-" +
          r.id +
          "-" +
          r.matchedMinor,
        leftOrderId: l.id,
        rightOrderId: r.id,
        amountMinor: amount,
      });
      l.matchedMinor += amount;
      r.matchedMinor += amount;
    }
  return allocations;
}
export function runMatching(state: State, actor: Actor, at: string) {
  admin(actor);
  const next = matchOrders(state.orders);
  for (const allocation of next) {
    for (const id of [allocation.leftOrderId, allocation.rightOrderId]) {
      const o = orderById(state, id);
      o.matchedMinor = add(o.matchedMinor, allocation.amountMinor);
      o.status =
        o.matchedMinor === o.amountMinor
          ? "FULLY_MATCHED"
          : "PARTIALLY_MATCHED";
    }
    state.allocations.push(allocation);
  }
  if (next.length)
    audit(
      state,
      actor,
      "MATCHING_EXECUTED",
      "market",
      next.length + " asignaciones nuevas",
      at,
    );
  return next;
}
export function createBatch(state: State, actor: Actor, at: string) {
  admin(actor);
  const allocations = state.allocations.filter((a) => !a.batchId);
  if (!allocations.length) return null;
  const batch: Batch = {
    id: "SB-" + String(state.batches.length + 1).padStart(4, "0"),
    createdAt: at,
    status: "OPEN",
    instructions: [],
  };
  for (const a of allocations) {
    a.batchId = batch.id;
    for (const orderId of [a.leftOrderId, a.rightOrderId]) {
      const o = orderById(state, orderId);
      batch.instructions.push({
        id: batch.id + "-I-" + (batch.instructions.length + 1),
        allocationId: a.id,
        orderId,
        side: o.side === "NEED_US_SETTLEMENT" ? "USA" : "CUBA",
        amountMinor: a.amountMinor,
        status: "PENDING",
      });
      if (o.matchedMinor === o.amountMinor) o.status = "SETTLEMENT_PENDING";
    }
  }
  state.batches.push(batch);
  audit(
    state,
    actor,
    "BATCH_CREATED",
    batch.id,
    allocations.length + " asignaciones reservadas",
    at,
  );
  return batch;
}
export interface SandboxProvider {
  readonly mode: "SIMULATION";
  confirm(instruction: Instruction): {
    reference: string;
    amountMinor: number;
    currency: "USD";
  };
}
export const mockProvider: SandboxProvider = {
  mode: "SIMULATION",
  confirm(i) {
    return {
      reference: "MOCK-" + i.id,
      amountMinor: i.amountMinor,
      currency: "USD",
    };
  },
};
export function confirmPayouts(
  state: State,
  actor: Actor,
  batchId: string,
  at: string,
  provider: SandboxProvider = mockProvider,
) {
  admin(actor);
  ensure(provider.mode === "SIMULATION", "REAL_RAILS_DISABLED", 403);
  const batch = state.batches.find((b) => b.id === batchId);
  ensure(batch, "BATCH_NOT_FOUND", 404);
  if (
    batch.status === "CLOSED" ||
    batch.instructions.every((i) => i.status === "CONFIRMED")
  )
    return;
  for (const instruction of batch.instructions) {
    if (instruction.status === "CONFIRMED") continue;
    const receipt = provider.confirm(instruction);
    ensure(
      receipt.amountMinor === instruction.amountMinor &&
        receipt.currency === "USD" &&
        !!receipt.reference,
      "PAYOUT_MISMATCH",
      409,
    );
    Object.assign(instruction, {
      status: "CONFIRMED",
      providerReference: receipt.reference,
      confirmedAmountMinor: receipt.amountMinor,
      currency: receipt.currency,
    });
  }
  audit(
    state,
    actor,
    "MOCK_PAYOUTS_CONFIRMED",
    batchId,
    batch.instructions.length +
      " instrucciones confirmadas por el proveedor simulado",
    at,
  );
}
export function reconcileBatch(
  state: State,
  actor: Actor,
  batchId: string,
  at: string,
) {
  admin(actor);
  const batch = state.batches.find((b) => b.id === batchId);
  ensure(batch, "BATCH_NOT_FOUND", 404);
  if (batch.status === "CLOSED") return batch;
  const allocations = state.allocations.filter((a) => a.batchId === batchId);
  ensure(
    allocations.length > 0 &&
      batch.instructions.length === allocations.length * 2,
    "INVALID_BATCH",
    409,
  );
  const references = new Set<string>();
  for (const a of allocations)
    for (const id of [a.leftOrderId, a.rightOrderId]) {
      const matches = batch.instructions.filter(
        (i) => i.allocationId === a.id && i.orderId === id,
      );
      ensure(matches.length === 1, "INVALID_BATCH", 409);
      const i = matches[0],
        o = orderById(state, id);
      ensure(
        i.side === (o.side === "NEED_US_SETTLEMENT" ? "USA" : "CUBA") &&
          i.status === "CONFIRMED" &&
          i.amountMinor === a.amountMinor &&
          i.confirmedAmountMinor === a.amountMinor &&
          i.currency === "USD" &&
          !!i.providerReference,
        "PAYOUTS_NOT_RECONCILED",
        409,
      );
      ensure(
        !references.has(i.providerReference),
        "DUPLICATE_PROVIDER_REFERENCE",
        409,
      );
      references.add(i.providerReference);
      ensure(
        state.journals.some((j) => j.reference === "fund:" + id),
        "FUNDING_MISSING",
        409,
      );
    }
  // Store transactions roll back the entire command if any check fails.
  for (const i of batch.instructions) {
    const order = orderById(state, i.orderId);
    const settled = add(order.settledMinor, i.amountMinor);
    ensure(settled <= order.matchedMinor, "OVER_SETTLEMENT", 409);
    const fee =
      feeFor(settled, order.feeBps) - feeFor(order.settledMinor, order.feeBps);
    const lines: LedgerLine[] = [
      {
        account: "liability:" + order.id,
        debitMinor: add(i.amountMinor, fee),
        creditMinor: 0,
      },
      {
        account: "sandbox:clearing",
        debitMinor: 0,
        creditMinor: i.amountMinor,
      },
    ];
    if (fee)
      lines.push({
        account: "sandbox:fee-revenue",
        debitMinor: 0,
        creditMinor: fee,
      });
    recordJournal(state, "settle:" + i.id, lines, at);
    order.settledMinor = settled;
    order.status =
      settled === order.amountMinor
        ? "SETTLED"
        : order.matchedMinor === order.amountMinor
          ? "SETTLEMENT_PENDING"
          : "PARTIALLY_MATCHED";
    audit(
      state,
      actor,
      "ORDER_SETTLEMENT_POSTED",
      order.id,
      formatUsd(i.amountMinor) + " liquidados en simulación",
      at,
      order.organizationId,
    );
  }
  for (const journal of state.journals) assertBalanced(journal.lines);
  batch.status = "CLOSED";
  batch.closedAt = at;
  audit(
    state,
    actor,
    "BATCH_RECONCILED",
    batchId,
    "Instrucciones, importes y asientos verificados; lote cerrado",
    at,
  );
  return batch;
}
export function emptyState(): State {
  return {
    version: 1,
    organizations: [],
    orders: [],
    allocations: [],
    batches: [],
    journals: [],
    audit: [],
    users: [],
    sessions: [],
    invites: [],
    attempts: {},
  };
}
export function seedDemo(state: State, actor: Actor, at: string) {
  admin(actor);
  if (state.audit.some((a) => a.action === "DEMO_SEEDED")) return;
  const amounts = [25000000, 8000000, 17000000, 10000000, 30000000, 10000000];
  for (let n = 0; n < amounts.length; n++) {
    const orgId = "demo-org-" + (n + 1);
    state.organizations.push({
      id: orgId,
      legalName: "Empresa ficticia " + (n + 1),
      country: n < 3 ? "CU" : "US",
      registrationNo: "DEMO",
      taxId: "DEMO",
      ownerName: "Persona ficticia",
      sourceOfFunds: "Fondos simulados",
      status: "VERIFIED",
      createdAt: at,
    });
    const order: Order = {
      id: "DEMO-" + (n + 1),
      organizationId: orgId,
      side: n < 3 ? "NEED_US_SETTLEMENT" : "NEED_CUBA_LIQUIDITY",
      amountMinor: amounts[n],
      matchedMinor: 0,
      settledMinor: 0,
      feeBps: 400,
      purposeCode: "SUPPLIER_PAYMENT",
      status: "AWAITING_FUNDING",
      createdAt: at,
    };
    state.orders.push(order);
    fundOrder(state, actor, order.id, at);
  }
  audit(
    state,
    actor,
    "DEMO_SEEDED",
    "market",
    "6 órdenes ficticias; 500.000 USD por lado",
    at,
  );
}
/** Explicit allowlist: no counterpart IDs or other companies in business responses. */
export function viewFor(state: State, actor: Actor) {
  if (actor.role === "ADMIN")
    return {
      actor,
      organizations: state.organizations,
      orders: state.orders,
      allocations: state.allocations,
      batches: state.batches,
      journals: state.journals,
      audit: [...state.audit].reverse(),
      market: getMarketSummary(state.orders),
    };
  const orders = state.orders.filter(
    (o) => o.organizationId === actor.organizationId,
  );
  return {
    actor,
    organizations: state.organizations.filter(
      (o) => o.id === actor.organizationId,
    ),
    orders,
    allocations: [] as Allocation[],
    batches: [] as Batch[],
    journals: [] as Journal[],
    audit: [...state.audit]
      .reverse()
      .filter((a) => a.organizationId === actor.organizationId)
      .map((a) => ({
        ...a,
        actorId: a.actorId === actor.id ? actor.id : "operations",
      })),
    market: getMarketSummary(orders),
  };
}
export type Dashboard = ReturnType<typeof viewFor>;
