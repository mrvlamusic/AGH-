# CubPay Architecture

## Product boundary
CubPay coordinates verified B2B liquidity needs and settlement instructions. The MVP is simulation-only and must not be interpreted as authorization to transmit money.

## Domain flow
1. Invitation
2. Organization onboarding
3. KYB/compliance review
4. Order creation
5. Sandbox funding confirmation
6. Private order-book matching
7. Partial/full allocations
8. Settlement batch
9. Mock provider confirmations
10. Reconciliation
11. Double-entry ledger finalization
12. Audit trail

## Two order sides
- NEED_US_SETTLEMENT
- NEED_CUBA_LIQUIDITY

Business users never see counterparties. Only authorized operational roles may inspect the allocation graph.

## Architecture choice
Start as a modular monolith:
- Web portal
- Admin/compliance portal
- API/domain layer
- PostgreSQL
- Background jobs
- Provider adapter boundary

Extract services only when operational scale or independent deployment requirements justify it.

## Provider adapters
Real-world rails must later implement normalized interfaces such as:
- CubaLiquidityProvider
- USSettlementProvider
- KYBProvider
- SanctionsProvider

Until legal/regulatory approvals and contracts exist, only mock providers are permitted.
