# Build / Verification Status

## Verified in this environment

- Static repository verification passes with `node scripts/static-verify.mjs`.
- Required application, schema, migration, twist service, route, and test artifacts are present.
- Platinum tier logic is present in the domain layer and UI types.
- Point-lot expiry and deterministic `/clock` workflow are present.
- `MEMBER_TIER_CHANGED` transactional outbox integration is present.
- Documentation includes the updated twist rules and endpoints.
- Exactly three future features remain documented under `What we'd build next`.

## Not runtime-verified in this environment

The container does not have the project's npm dependency tree and cannot reach the npm registry. Therefore these commands were not truthfully claimable as passed here:

```bash
npm install
npm test
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
```

The repository should be run locally with PostgreSQL/Docker to perform the full runtime verification.

## Recommended local verification

```bash
npm install
docker compose up -d postgres
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm run build
npm run lint
npm run dev
```

For the updated twists, verify:

1. A member at lifetime 4,990 making a Gold-rate purchase that reaches 5,000 becomes Platinum and creates one pending `MEMBER_TIER_CHANGED` event in `GET /outbox`.
2. Repeating the same purchase with the same `clientRequestId` does not create a second purchase, point lot, or notification event.
3. Create/seed a 100-point lot with an expired `expiresAt`, call `POST /clock`, and confirm the member balance falls by 100, an `EXPIRATION` ledger entry appears, and lifetime earned points/tier are unchanged.
4. Advance the clock past an earning lot's `expiresAt` and verify the expiry worker is idempotent: calling `/clock` again does not expire the same lot twice.
5. A Platinum purchase of `100.00` earns 30 points using the 0.30 multiplier.
