# Engineering Reasoning

## 1. Problem interpretation

The brief is a café staff counter system where correctness of member points is the primary product requirement. The UI therefore stays intentionally operational: fast member lookup, clear balance/tier visibility, purchase earning, redemption, and transaction history.

## 2. Key assumptions

- One configured loyalty program is active for the database at a time.
- Staff users are trusted operational users; RBAC starts with `STAFF` and the schema leaves room for `ADMIN`.
- Demo currency is INR, while the program stores a currency code so another café can change it.
- Members are identified by a normalized phone number.
- Current balance is a cache of the ledger sum, maintained atomically for fast counter reads.

## 3. Core business rules

- Bronze: 0–499 lifetime earned points, 1.00x.
- Silver: 500–1499, 1.25x.
- Gold: 1500+, 1.50x.
- Base earning is 1 point per currency unit.
- Purchase tier is determined before the purchase changes lifetime points.
- Fractional points are rounded down.
- Redemption decreases current balance only and never decreases lifetime earned points.

## 4. Why a points ledger exists

Directly overwriting a balance would lose the reason for the change and make audit/debugging difficult. `PointLedger` records each delta and resulting balance, while purchase/redemption tables retain the business event that caused the delta.

## 5. Why database transactions are used

A purchase touches purchase history, the ledger, member lifetime points, member balance, and tier. A redemption touches redemption history, the ledger, and balance. These changes must either all commit or all roll back, so they are performed in one PostgreSQL transaction.

## 6. Tier calculation

Tier is a deterministic function of lifetime earned points. It is calculated before a purchase for the purchase rate and recalculated after the purchase for the resulting tier.

## 7. Redemption correctness

The backend verifies that the reward exists and is active and that the member has enough points. A member row lock is taken inside the transaction before checking the balance. The database therefore serializes concurrent redemptions against the same member.

## 8. Concurrency and idempotency

Purchase and redemption APIs require a client request ID. It is stored under a unique constraint for the corresponding operation. If a retry reaches the server after the original request has committed, the existing operation can be returned rather than issuing points a second time.

## 9. Historical accuracy

Each purchase stores `tierAtPurchase` and `earningMultiplier`. If configuration changes later, historical purchase calculations remain unchanged.

## 10. Schema design

The data is normalized around users, members, rewards, purchases, redemptions, and a ledger. Foreign keys connect business events to members and staff. Deletion is intentionally limited so operational history is not silently removed.

## 11. Search, pagination, and sorting

Member search runs in PostgreSQL across normalized phone and name. Pagination limits response size. Sorting is restricted to an explicit allow-list before constructing Prisma `orderBy` values.

## 12. Authentication

Passwords are hashed using bcrypt. Authentication is a signed JWT placed in an HTTP-only cookie, reducing the chance of accidentally exposing the token to browser JavaScript. Protected backend routes require the authenticated staff role. The frontend checks `/api/auth/me` on app load.

## 13. Testing strategy

Pure loyalty calculations are covered independently because they are easy to exercise exhaustively. API integration tests are also included and become active when a PostgreSQL test database is supplied. The target scenarios include tier transitions, redemption safety, duplicate requests, search, pagination, and sorting.

## 14. Bugs/issues discovered during development

The repository is generated as a complete baseline rather than presenting a fabricated narrative of bugs. Any real development-time issue discovered after running the project should be recorded here with its symptom, cause, and fix instead of inventing an AI chain-of-thought.

## 15. Final verification approach

The final verification checklist is:

- TypeScript builds for server and client.
- Unit tests pass for loyalty/domain logic.
- Prisma client generates successfully.
- When PostgreSQL is available: migrations deploy, seed runs, API integration tests execute, and the full operational workflow is exercised.
- The browser uses actual REST responses instead of hard-coded operational data.

## Updated twist reasoning

### Platinum backward compatibility

The new top tier is represented by the same deterministic tier function rather than a special-case check in controllers. The tier order is now Bronze → Silver → Gold → Platinum, with Platinum beginning at 5,000 lifetime earned points. Its multiplier is 0.30x exactly as specified by the updated brief.

The migration changes only rows that already qualify for Platinum. It does not modify an existing member's points balance. Purchases calculate the effective tier from lifetime earned points at transaction start, which also prevents a stale cached tier from causing the wrong earning rate after the new tier is introduced.

### Expiring points need point lots

A single aggregate balance cannot tell the system which points should expire first. Therefore every positive earning operation creates a `PointLot` with an absolute expiry timestamp and a remaining quantity. Redemptions consume earliest-expiring lots first. This preserves a deterministic FIFO-like expiry policy and lets the system subtract exactly the unused portion of each earning event.

Expiration is an accounting event, not a tier event. The job decreases `currentPointsBalance`, creates an `EXPIRATION` ledger row, and leaves `lifetimeEarnedPoints` and `currentTier` unchanged.

### Deterministic clock

The application has a persisted `ClockState`. Business writes use the application clock instead of relying exclusively on the host machine clock. `POST /clock` can set an exact timestamp or advance the clock by days/hours/minutes/seconds and then run the expiration worker. This makes the 90-day rule deterministic and reproducible for an evaluator.

### Tier-change notifications use the transactional outbox pattern

The purchase transaction detects a change between the tier at purchase start and the tier after earning points. When the tier changes, it inserts a `MEMBER_TIER_CHANGED` outbox event before the transaction commits.

This is intentionally not an HTTP call to an external notification provider inside the purchase transaction. External network calls inside a database transaction would make correctness depend on another service's availability and could cause duplicate delivery on retries. Instead, the database transaction commits the outbox event atomically with the purchase, and the Notification Service boundary can read/acknowledge those events through `/outbox`.

### Migration of pre-existing balances

The expiry feature introduces `PointLot` records after the original aggregate-balance model already existed. The migration therefore creates one `LEGACY_BALANCE` lot for each pre-existing positive balance. This preserves the balance during upgrade rather than silently deleting points. Those migrated points receive a fresh 90-day expiry window because the original earning-lot boundaries were not persisted by the previous schema.

### New invariants

In addition to the original balance invariants:

- A non-expired point lot cannot be consumed twice.
- An expired lot has zero remaining points after the expiry job processes it.
- The sum of remaining point lots represents the spendable point balance.
- Point expiration does not lower lifetime earned points or the member tier.
- A qualifying tier transition creates exactly one outbox event for the idempotent purchase request.
- The outbox event and the tier/balance change commit together.
