# CaféPoints

CaféPoints is a staff-facing café loyalty counter system built around one core promise: **a member's points balance remains correct under normal use, retries, and concurrent requests**.

## Problem

Café staff need a fast way to find members, record purchases, award the correct tier-based points, and redeem rewards without letting manual calculations or concurrent actions corrupt balances.

## Product overview

- Public landing page
- Staff registration, login, logout, and current-session lookup
- Member creation and server-side phone/name search
- Server-side pagination and sorting
- Purchase earning with historical tier/multiplier snapshotting
- Reward redemption with balance validation
- Append-oriented points ledger
- Transactional balance/lifetime/tier updates
- Idempotency for purchase/redemption writes
- Dashboard summary and recent activity
- Seeded fictional demo data

## Tech stack

- Frontend: React, Vite, TypeScript, React Router
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT in an HTTP-only cookie + bcrypt password hashing
- Validation: Zod
- Tests: Vitest + Supertest (API integration suite available when a PostgreSQL test database is provided)

## Architecture

```text
Browser
  |
  | JSON / REST + httpOnly JWT cookie
  v
Express API
  |
  +-- auth middleware / validators
  +-- member / purchase / redemption services
  +-- transactional loyalty service
  |
  v
Prisma
  |
  v
PostgreSQL
```

The purchase and redemption flows are the critical path. They use a database transaction, lock the member row, check idempotency, write the business record and ledger entry, and update the cached balance in the same transaction.

## Loyalty rules

| Tier | Lifetime earned points | Multiplier |
|---|---:|---:|
| Bronze | 0–499 | 1.00x |
| Silver | 500–1499 | 1.25x |
| Gold | 1500–4999 | 1.50x |
| Platinum | 5000+ | 0.30x |

Base earning is 1 point per 1 unit of purchase currency. The tier used for a purchase is the tier **at the start of that purchase**. After points are awarded, lifetime earned points determine the resulting tier. Redemption changes current balance only; it never decreases lifetime earned points or tier. Unused points expire 90 days after each earning event.

Fractional points are rounded down. Money is represented as PostgreSQL `NUMERIC` and calculations use `decimal.js` rather than JavaScript floating-point arithmetic.

## Database schema overview

- `User` — authenticated café staff
- `Member` — loyalty member profile and cached balance/lifetime totals
- `Reward` — redeemable rewards
- `Purchase` — historical purchase amount and the exact tier/multiplier used
- `Redemption` — reward redemption event
- `PointLedger` — append-oriented source-of-record for every points change
- `LoyaltyProgram` — configurable thresholds, multipliers, base rate, and currency

Important unique/indexed fields include user email, normalized member phone, purchase/redemption client request IDs, and member/ledger foreign keys.

## Setup

### 1. Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (or Docker)

### 2. Install

```bash
npm install
```

### 3. Start PostgreSQL

The easiest local option is Docker:

```bash
docker compose up -d postgres
```

If you do not use Docker, create a PostgreSQL database named `cafe_points` and update `DATABASE_URL`.

### 4. Environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` and a strong `JWT_SECRET`.

### 5. Generate Prisma client and apply migrations

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 6. Start development servers

```bash
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000`

### 7. Test

```bash
npm test
```

The unit suite runs without PostgreSQL. The optional API integration suite activates when `RUN_DB_TESTS=true` and a test `DATABASE_URL` is available.

## Demo credentials

Seeded staff account:

- Email: `staff@cafepoints.demo`
- Password: `DemoPass123!`

A second account is also seeded:

- Email: `manager@cafepoints.demo`
- Password: `DemoPass123!`

All sample data is fictional.

## REST API

All `/api/*` operational endpoints except registration/login/health require authentication unless stated otherwise. Authentication is maintained with an HTTP-only JWT cookie.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/register` | Register staff user | No |
| POST | `/api/auth/login` | Authenticate | No |
| GET | `/api/auth/me` | Current user | Yes |
| POST | `/api/auth/logout` | Clear session cookie | No |
| POST | `/api/members` | Create member | Yes |
| GET | `/api/members` | Search/paginate/sort members | Yes |
| GET | `/api/members/:id` | Member detail | Yes |
| GET | `/api/members/:id/transactions` | Member ledger/history | Yes |
| POST | `/api/members/:id/purchases` | Record purchase | Yes |
| POST | `/api/members/:id/redemptions` | Redeem reward | Yes |
| GET | `/api/rewards` | List active rewards | Yes |
| GET | `/api/dashboard/summary` | Dashboard totals/activity | Yes |

### `POST /api/auth/register`

Body:

```json
{
  "name": "Alex Staff",
  "email": "alex@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

Validation: name required, valid email, password at least 8 characters, confirmation must match, email unique.

### `POST /api/auth/login`

Body:

```json
{
  "email": "staff@cafepoints.demo",
  "password": "DemoPass123!"
}
```

### `POST /api/members`

Body:

```json
{
  "fullName": "Taylor Chen",
  "phoneNumber": "+1 (555) 010-1234",
  "email": "taylor@example.com"
}
```

The phone is normalized before storage and must be unique.

### `GET /api/members`

Example:

```text
/api/members?search=987654&page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

Allowed `sortBy`: `name`, `phone`, `tier`, `balance`, `lifetimeEarnedPoints`, `createdAt`.  
`pageSize` is bounded to 100.

Response shape:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 1000,
  "totalPages": 50,
  "hasNext": true,
  "hasPrevious": false
}
```

### `POST /api/members/:id/purchases`

Body:

```json
{
  "amount": "100.00",
  "currency": "INR",
  "clientRequestId": "purchase-123",
  "notes": "Counter order"
}
```

Response example:

```json
{
  "success": true,
  "purchase": {
    "id": "...",
    "amount": "100.00",
    "tierAtPurchase": "SILVER",
    "earningMultiplier": 1.25,
    "pointsEarned": 125,
    "createdAt": "..."
  },
  "member": {
    "id": "...",
    "currentTier": "SILVER",
    "lifetimeEarnedPoints": 925,
    "currentPointsBalance": 475
  }
}
```

### `POST /api/members/:id/redemptions`

Body:

```json
{
  "rewardId": "...",
  "clientRequestId": "redemption-123",
  "notes": "Counter redemption"
}
```

### Error format

```json
{
  "error": {
    "code": "INSUFFICIENT_POINTS",
    "message": "Member does not have enough points for this reward."
  }
}
```

Typical statuses: `200`, `201`, `400`, `401`, `404`, `409`, `422`, `500`.

Important error codes include:

- `INVALID_CREDENTIALS`
- `DUPLICATE_EMAIL`
- `DUPLICATE_PHONE`
- `INVALID_PURCHASE_AMOUNT`
- `REWARD_NOT_FOUND`
- `REWARD_INACTIVE`
- `INSUFFICIENT_POINTS`
- `MEMBER_NOT_FOUND`
- `DUPLICATE_REQUEST`
- `VALIDATION_ERROR`

## Example business scenarios

1. Bronze member at 490 lifetime points buys 20: earns 20, finishes at 510 lifetime points, and becomes Silver. The purchase still used Bronze's 1.00x rate.
2. Silver member buys 100: earns 125.
3. Gold member redeems 100 from a 100-point balance: balance reaches 0, lifetime earned stays unchanged, and tier remains Gold.
4. Two simultaneous redemptions for the same 100-point balance cannot both succeed because the member row is locked inside the transaction.
5. Repeating a purchase request with the same client request ID returns the original result rather than issuing points twice.

## Design decisions

### Ledger + cached balance

The ledger makes every point change explainable. The cached member balance makes current reads fast. Both are updated atomically, so the cache cannot intentionally drift from the transaction that caused the change.

### Database transactions and row locking

Purchase/redemption workflows run inside one database transaction. The member row is locked before balance-sensitive decisions. A failed validation or database error rolls the entire operation back.

### Historical snapshots

Purchases store the tier and multiplier actually used. Future rule changes therefore do not rewrite history.

### Server-side search/pagination/sorting

The member list is expected to grow. Search and pagination stay in the database rather than loading the whole dataset into the browser. Sort fields are whitelisted to prevent unsafe dynamic SQL.

## Known limitations

- This build targets a single café loyalty program per database; multi-store isolation is future work.
- Token revocation is client/session-cookie based; adding a server-side session store would support immediate revocation of every issued JWT.
- SMS/WhatsApp notifications and analytics are intentionally not implemented.
- Production deployment still requires configuring a managed PostgreSQL instance, HTTPS, and a production secret.

## What we'd build next

1. Multi-store / branch management
2. SMS/WhatsApp reward notifications
3. Analytics and loyalty insights

## GitHub publishing checklist

```bash
git init
git add .
git commit -m "Build CaféPoints loyalty counter system"
git branch -M main
git remote add origin https://github.com/<your-username>/cafe-points.git
git push -u origin main
```

Before pushing, confirm `.env` is not tracked and replace any local secrets. Do not commit `node_modules` or build output.

## AI_LOGS.md requirement

The challenge requires the **complete, unmodified AI conversation** pasted into `AI_LOGS.md`. This environment cannot export the entire chat transcript automatically. Do not use a generated summary as a substitute. Before submission, copy/export the full conversation exactly as it appeared and replace the placeholder in `AI_LOGS.md`.

## Endpoint detail matrix

| Endpoint | Request | Key validation | Success |
|---|---|---|---|
| `POST /api/auth/register` | JSON: `name`, `email`, `password`, `confirmPassword` | valid email, password ≥8 chars, matching confirmation, unique email | `201` + user + session cookie |
| `POST /api/auth/login` | JSON: `email`, `password` | valid email, non-empty password | `200` + user + session cookie |
| `GET /api/auth/me` | none | authenticated session | `200` + user |
| `POST /api/auth/logout` | none | none | `200` + cleared session cookie |
| `POST /api/members` | JSON: `fullName`, `phoneNumber`, optional `email` | name required, phone must contain digits, normalized phone unique | `201` + member |
| `GET /api/members` | query: `search`, `page`, `pageSize`, `sortBy`, `sortOrder` | bounded page/pageSize; sort allow-list | `200` + items + pagination metadata |
| `GET /api/members/:id` | path `id` | UUID, member must exist | `200` + member + tier progression |
| `GET /api/members/:id/transactions` | path `id`; query `page`, `pageSize` | UUID, bounded pagination | `200` + ledger entries + metadata |
| `POST /api/members/:id/purchases` | JSON: `amount`, `currency`, `clientRequestId`, optional `notes` | amount > 0; max 2 decimals; active programme currency; idempotency key | `201` + purchase + updated member |
| `POST /api/members/:id/redemptions` | JSON: `rewardId`, `clientRequestId`, optional `notes` | reward exists/active; sufficient balance; idempotency key | `201` + redemption + updated member |
| `GET /api/rewards` | none | authenticated | `200` + active rewards |
| `GET /api/dashboard/summary` | none | authenticated | `200` + live aggregates/activity |
| `GET /api/health` | none | none | `200` when database reachable; `503` otherwise |

For write endpoints, validation failures use `422`; missing resources use `404`; conflicts such as duplicate phones, inactive rewards, or insufficient points use `409`; missing/invalid auth uses `401`.

## Business invariants enforced by the backend

- A member balance is never intentionally allowed below zero.
- A redemption checks the locked, current balance inside the transaction.
- A purchase creates a purchase record and positive ledger entry before updating the member cache.
- A redemption creates a redemption record and negative ledger entry before updating the member cache.
- Lifetime earned points are changed only by earning operations in the current implementation.
- Redemption never recalculates or lowers the member's tier.
- Purchase tier/multiplier snapshots are stored on the purchase record.
- Client request IDs are unique for purchase and redemption records.
- Failed transactions are rolled back by PostgreSQL.

## Updated twists: Platinum, expiry, and notifications

The current version also implements the three challenge twists:

### Level 1 — Platinum (backward compatible)

- Platinum starts at **5,000 lifetime earned points**.
- Platinum earns at **0.30 points per ₹1**.
- Existing member balances are not changed by the tier migration.
- Only an existing member whose lifetime points are already at least 5,000 is promoted to Platinum during migration.
- Every purchase snapshots the actual tier and multiplier used at that moment, so changing the active rules does not rewrite history.

### Level 2 — 90-day point expiry

Points are tracked as individual `PointLot` records. Each earning lot stores `earnedAt`, `expiresAt`, `originalPoints`, and `remainingPoints`.

- Unused points expire 90 days after the earning event by default.
- Redemption consumes the lots with the earliest expiry first.
- Expiration creates a negative `EXPIRATION` ledger entry and updates the cached balance atomically.
- Expiration never changes lifetime earned points or tier.
- `POST /clock` advances/sets the deterministic application clock and runs the expiry job. This is the grading/test hook for the automation twist.

Accepted clock payload examples:

```json
{ "advanceDays": 91 }
```

```json
{ "now": "2026-12-20T12:00:00.000Z" }
```

### Level 3 — tier-change notification via outbox

When a purchase crosses a tier threshold, the same database transaction writes a durable `OutboxEvent` with event type `MEMBER_TIER_CHANGED`.

The event contains the member ID, name, phone number, previous tier, new tier, notification message, and event timestamp. Because the outbox row is committed in the same transaction as the purchase, the notification cannot be silently lost after a successful tier transition.

The grading/read boundary is:

```text
GET /outbox
GET /api/outbox
```

Pending events can be acknowledged through `POST /outbox` or `POST /api/outbox` with either `{ "id": "..." }` or `{ "ids": ["..."] }`.

The application also exposes the same clock endpoint below `POST /api/clock` for API clients that prefer the `/api/*` namespace.

## Updated REST endpoints for the twists

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/clock` | Set/advance deterministic clock and run point-expiry job | No |
| GET | `/outbox` | Read pending notification events for the integration grader | No |
| POST | `/outbox` | Acknowledge one or more outbox events | No |
| POST | `/api/clock` | API-prefixed alias of `/clock` | No |
| GET | `/api/outbox` | API-prefixed alias of `/outbox` | No |
| POST | `/api/outbox` | API-prefixed alias of outbox acknowledgement | No |

## Updated business scenarios

6. A Platinum member at 5,000+ lifetime points earns at 0.30x on the next purchase.
7. A member's unused points disappear from the balance after their individual 90-day expiry timestamp is reached.
8. Redeeming points consumes the earliest-expiring available point lots first.
9. Advancing `/clock` beyond an expiry threshold causes the expiration job to create `EXPIRATION` ledger entries and reduce the live balance without changing lifetime earned points.
10. A purchase that moves Bronze → Silver, Silver → Gold, or Gold → Platinum writes one `MEMBER_TIER_CHANGED` event to the outbox in the same transaction.
11. Retrying the same purchase idempotency key does not create a second purchase, second point lot, or second tier notification.

## Updated data model

In addition to the original entities, the database now contains:

- `PointLot` — the unexpired/unredeemed portion of an earning grant, including its expiry timestamp.
- `ClockState` — the deterministic application clock used by the grading hook and expiry worker.
- `OutboxEvent` — durable notification events that bridge the loyalty transaction to the Notification Service.

`LoyaltyProgram` now also stores the Platinum threshold/multiplier and configurable points expiry days.
