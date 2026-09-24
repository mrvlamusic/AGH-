# CubPay Codex Instructions

## Mission
Build CubPay as an invite-only B2B liquidity and settlement coordination platform.

## Non-negotiable boundaries
- Simulation only until regulated partners and legal approval exist.
- Never connect real money rails without explicit approval.
- Never implement sanctions/AML evasion, hidden netting, crypto workarounds, or cash collection outside approved providers.
- Business users never see matched counterparties.
- Every money movement is modeled with integer minor units and double-entry ledger entries.
- Every sensitive action is auditable.

## Core domains
Identity, Organizations, KYB, Compliance, Orders, Matching, Ledger, Settlement, Reconciliation, Audit, Provider Adapters.

## Engineering rules
- TypeScript strict mode.
- No floating point money math.
- Domain logic independent from UI.
- Idempotent settlement and provider events.
- State machines must reject illegal transitions.
- Matching supports partial fills and concurrency safety.
- Provider integrations live behind adapters.
- Prefer a modular monolith until scale requires extraction.

## MVP workflow
Invite -> Organization -> KYB -> Verified -> Create Order -> Compliance -> Sandbox Funding -> Open -> Match -> Settlement Batch -> Mock Payout -> Reconciliation -> Settled.
