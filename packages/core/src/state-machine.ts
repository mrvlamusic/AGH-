export const ORDER_TRANSITIONS = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["COMPLIANCE_REVIEW", "CANCELLED"],
  COMPLIANCE_REVIEW: ["APPROVED", "REJECTED", "ON_HOLD"],
  APPROVED: ["AWAITING_FUNDING", "CANCELLED"],
  AWAITING_FUNDING: ["FUNDED", "CANCELLED", "ON_HOLD"],
  FUNDED: ["OPEN", "ON_HOLD"],
  OPEN: ["PARTIALLY_MATCHED", "FULLY_MATCHED", "CANCELLED", "ON_HOLD"],
  PARTIALLY_MATCHED: ["PARTIALLY_MATCHED", "FULLY_MATCHED", "ON_HOLD"],
  FULLY_MATCHED: ["SETTLEMENT_PENDING", "ON_HOLD"],
  SETTLEMENT_PENDING: ["SETTLED", "ON_HOLD"],
  SETTLED: [],
  CANCELLED: [],
  REJECTED: [],
  ON_HOLD: ["COMPLIANCE_REVIEW", "APPROVED", "AWAITING_FUNDING", "OPEN"],
} as const;

export type FullOrderStatus = keyof typeof ORDER_TRANSITIONS;

export function assertOrderTransition(
  from: FullOrderStatus,
  to: FullOrderStatus,
) {
  const allowed = ORDER_TRANSITIONS[from] as readonly string[];
  if (!allowed.includes(to))
    throw new Error(`INVALID_STATE_TRANSITION:${from}->${to}`);
}
