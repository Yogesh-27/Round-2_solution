-- Platinum is backward-compatible: only members that now qualify are promoted.
UPDATE "Member"
SET "currentTier" = 'PLATINUM'
WHERE "lifetimeEarnedPoints" >= 5000
  AND "currentTier" <> 'PLATINUM';

-- Preserve existing aggregate balances during the expiry-model migration.
-- Legacy balances receive a fresh 90-day lot rather than silently disappearing.
INSERT INTO "PointLot" (
  "id", "memberId", "sourceType", "sourceId", "originalPoints", "remainingPoints", "earnedAt", "expiresAt", "createdAt"
)
SELECT
  gen_random_uuid(),
  m."id",
  'LEGACY_BALANCE',
  NULL,
  m."currentPointsBalance",
  m."currentPointsBalance",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + (COALESCE((SELECT lp."pointsExpiryDays" FROM "LoyaltyProgram" lp WHERE lp."active" = true ORDER BY lp."createdAt" DESC LIMIT 1), 90) * INTERVAL '1 day'),
  CURRENT_TIMESTAMP
FROM "Member" m
WHERE m."currentPointsBalance" > 0;
