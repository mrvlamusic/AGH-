export type SettlementSide = "CUBA" | "USA";
export type SettlementInstruction = {
  id: string;
  side: SettlementSide;
  amountMinor: number;
  allocationId: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
};

export type SettlementBatch = {
  id: string;
  createdAt: string;
  status: "OPEN" | "RECONCILIATION_REQUIRED" | "CLOSED";
  instructions: SettlementInstruction[];
};

export function buildSettlementBatch(
  allocations: { id: string; amountMinor: number }[],
  id = "SB-DEMO-001",
): SettlementBatch {
  const instructions: SettlementInstruction[] = allocations.flatMap((a) => [
    { id: `${a.id}-CU`, side: "CUBA", amountMinor: a.amountMinor, allocationId: a.id, status: "PENDING" },
    { id: `${a.id}-US`, side: "USA", amountMinor: a.amountMinor, allocationId: a.id, status: "PENDING" },
  ]);
  return { id, createdAt: new Date().toISOString(), status: "OPEN", instructions };
}

export function reconcileBatch(batch: SettlementBatch) {
  const failed = batch.instructions.filter(i => i.status === "FAILED");
  const pending = batch.instructions.filter(i => i.status === "PENDING");
  return {
    canClose: failed.length === 0 && pending.length === 0,
    failedCount: failed.length,
    pendingCount: pending.length,
  };
}
