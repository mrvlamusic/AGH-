# CubPay MVP

CubPay is an invite-only B2B liquidity and settlement coordination platform for verified businesses.

> **Current mode: SIMULATION ONLY.** The MVP does not accept, custody, transmit or settle real customer money. Real provider adapters remain disabled until regulated partners and legal/compliance approvals exist.

## What is implemented

- Invite-only onboarding and KYB sandbox
- Business verification workflow
- Two-sided USD private order book
- `NEED_US_SETTLEMENT` and `NEED_CUBA_LIQUIDITY`
- Configurable 3–5% fee tiers
- FIFO-style deterministic matching
- Partial fills and multiple allocations
- Double-entry ledger validation primitives
- Settlement batch model
- Mock Cuba/U.S. payout workflow
- Reconciliation workflow
- Audit trail demo
- Admin matching view
- CSV order export
- NestJS/Fastify API skeleton
- PostgreSQL/Prisma domain schema
- Docker Compose for PostgreSQL + Redis
- GitHub CI
- Vercel monorepo deployment configuration

## Demo

### Install
```bash
pnpm install
```

### Web MVP
```bash
pnpm dev
```

Open `http://localhost:3000`.

### API
```bash
pnpm dev:api
```

API: `http://localhost:4000`.

### Infrastructure
```bash
docker compose up -d
cp .env.example .env
pnpm db:generate
pnpm db:push
```

## MVP walkthrough

1. Open `/onboarding`.
2. Complete the invite/KYB demo.
3. Approve KYB in sandbox.
4. Open the Trading Desk.
5. Create one or more orders.
6. Run the matching engine.
7. Inspect private partial/full allocations.
8. Create a settlement batch.
9. Confirm mock Cuba/U.S. payouts.
10. Reconcile and close.
11. Export CSV and inspect the audit trail.
12. Open `/admin` for internal visibility.

The seed order book has exactly **$500,000 vs $500,000** and demonstrates multi-order partial filling.

## Validation

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Documentation

- `AGENTS.md` — persistent Codex engineering rules
- `docs/ARCHITECTURE.md`
- `docs/MONEY_FLOW.md`
- `docs/COMPLIANCE_BOUNDARIES.md`
- `docs/MVP_DELIVERY.md`

## Production gate

Do not connect real financial rails until the exact Cuba/U.S. money flow is approved by applicable regulated partners and qualified counsel, and KYC/KYB/AML/sanctions controls are live.
