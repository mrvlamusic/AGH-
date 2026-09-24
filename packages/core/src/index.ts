export * from "./simulation";
export * from "./state-machine";

export type OrderSide = "NEED_US_SETTLEMENT" | "NEED_CUBA_LIQUIDITY";
export type OrderStatus = "OPEN" | "PARTIALLY_MATCHED" | "FULLY_MATCHED" | "SETTLEMENT_PENDING" | "SETTLED";

export type Order = {
  id: string;
  organizationId: string;
  side: OrderSide;
  amountMinor: number;
  matchedMinor: number;
  feeBps: number;
  status: OrderStatus;
  createdAt: string;
};

export type Allocation = {
  id: string;
  leftOrderId: string;
  rightOrderId: string;
  amountMinor: number;
};

export const demoOrders: Order[] = [
  { id:"CP-US-1001", organizationId:"org-a", side:"NEED_US_SETTLEMENT", amountMinor:250_000_00, matchedMinor:0, feeBps:400, status:"OPEN", createdAt:"2026-09-24T08:00:00Z" },
  { id:"CP-US-1002", organizationId:"org-b", side:"NEED_US_SETTLEMENT", amountMinor:80_000_00, matchedMinor:0, feeBps:500, status:"OPEN", createdAt:"2026-09-24T08:10:00Z" },
  { id:"CP-US-1003", organizationId:"org-c", side:"NEED_US_SETTLEMENT", amountMinor:170_000_00, matchedMinor:0, feeBps:350, status:"OPEN", createdAt:"2026-09-24T08:20:00Z" },
  { id:"CP-CU-2001", organizationId:"org-d", side:"NEED_CUBA_LIQUIDITY", amountMinor:100_000_00, matchedMinor:0, feeBps:400, status:"OPEN", createdAt:"2026-09-24T08:05:00Z" },
  { id:"CP-CU-2002", organizationId:"org-e", side:"NEED_CUBA_LIQUIDITY", amountMinor:300_000_00, matchedMinor:0, feeBps:300, status:"OPEN", createdAt:"2026-09-24T08:15:00Z" },
  { id:"CP-CU-2003", organizationId:"org-f", side:"NEED_CUBA_LIQUIDITY", amountMinor:100_000_00, matchedMinor:0, feeBps:450, status:"OPEN", createdAt:"2026-09-24T08:25:00Z" }
];

export function formatUsd(minor: number): string {
  return new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:0}).format(minor / 100);
}

export function getMarketSummary(orders: Order[]) {
  const needUs = orders.filter(o=>o.side==="NEED_US_SETTLEMENT").reduce((s,o)=>s+Math.max(0,o.amountMinor-o.matchedMinor),0);
  const needCuba = orders.filter(o=>o.side==="NEED_CUBA_LIQUIDITY").reduce((s,o)=>s+Math.max(0,o.amountMinor-o.matchedMinor),0);
  return { needUs, needCuba, matchable: Math.min(needUs,needCuba), imbalance: Math.abs(needUs-needCuba) };
}

export function matchOrders(orders: Order[]): Allocation[] {
  const left = orders.filter(o=>o.side==="NEED_US_SETTLEMENT").sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(o=>({...o}));
  const right = orders.filter(o=>o.side==="NEED_CUBA_LIQUIDITY").sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).map(o=>({...o}));
  const allocations: Allocation[] = [];
  let i=0,j=0,n=1;

  while(i<left.length && j<right.length){
    const l=left[i], r=right[j];
    const lRemaining=l.amountMinor-l.matchedMinor;
    const rRemaining=r.amountMinor-r.matchedMinor;

    if(lRemaining<=0){i++;continue}
    if(rRemaining<=0){j++;continue}

    const amount=Math.min(lRemaining,rRemaining);
    allocations.push({
      id:`AL-${String(n++).padStart(4,"0")}`,
      leftOrderId:l.id,
      rightOrderId:r.id,
      amountMinor:amount
    });

    l.matchedMinor+=amount;
    r.matchedMinor+=amount;

    if(l.matchedMinor===l.amountMinor)i++;
    if(r.matchedMinor===r.amountMinor)j++;
  }
  return allocations;
}

export type LedgerLine = { account: string; debitMinor: number; creditMinor: number };

export function assertBalanced(lines: LedgerLine[]) {
  const debit=lines.reduce((s,l)=>s+l.debitMinor,0);
  const credit=lines.reduce((s,l)=>s+l.creditMinor,0);
  if(debit!==credit) throw new Error("UNBALANCED_JOURNAL_ENTRY");
  return true;
}
