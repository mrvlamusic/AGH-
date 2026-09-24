# CubPay Money Flow — Simulation Model

## Important
This document describes software state transitions, not a currently authorized real-money flow.

### Side A: Need U.S. settlement
Verified business -> approved order -> sandbox Cuba-side funding confirmation -> order becomes OPEN -> matching -> U.S. settlement instruction -> mock U.S. provider confirmation -> reconciliation -> SETTLED.

### Side B: Need Cuba liquidity
Verified business -> approved order -> sandbox U.S.-side funding confirmation -> order becomes OPEN -> matching -> Cuba liquidity instruction -> mock Cuba provider confirmation -> reconciliation -> SETTLED.

## Matching
Matched counterparties remain private. One order may be filled by multiple opposite-side orders. Settlement activation with real providers requires legal approval and regulated partner integration.
