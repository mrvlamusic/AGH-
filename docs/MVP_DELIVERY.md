# CubPay MVP Delivery

## Demo flows
1. Open `/onboarding`.
2. Enter the invite/KYB demo data.
3. Submit KYB and approve it in sandbox mode.
4. Continue to `/simulation`.
5. Create one or more orders.
6. Run Matching.
7. Inspect partial/full allocations.
8. Create the daily settlement batch.
9. Confirm mock payouts.
10. Reconcile and close.
11. Export the order CSV.
12. Review the audit trail.
13. Open `/admin` for the internal matching view.

## Seed scenario
The initial order book contains $500,000 of NEED_US_SETTLEMENT and $500,000 of NEED_CUBA_LIQUIDITY. The matching engine decomposes this into multiple private allocations, proving partial-fill behavior.

## Production activation gate
This MVP must remain in simulation mode until:
- U.S. regulated money-transmission/banking partner is contracted and approved.
- Cuba-side authorized operator/legal structure is approved.
- KYC/KYB/AML/sanctions integrations are contracted.
- Legal/compliance review approves the exact money flow.
- Provider adapters pass sandbox and reconciliation testing.

No UI label or database state constitutes authorization to move customer funds.
