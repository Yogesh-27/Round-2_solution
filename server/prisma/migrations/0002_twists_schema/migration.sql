ALTER TYPE "Tier" ADD VALUE IF NOT EXISTS 'PLATINUM';
ALTER TYPE "PointTransactionType" ADD VALUE IF NOT EXISTS 'EXPIRATION';

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "platinumThreshold" INTEGER NOT NULL DEFAULT 5000,
  ADD COLUMN "platinumMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 0.30,
  ADD COLUMN "pointsExpiryDays" INTEGER NOT NULL DEFAULT 90;

ALTER TABLE "PointLedger"
  ALTER COLUMN "createdById" DROP NOT NULL;

CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSED');

CREATE TABLE "PointLot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "originalPoints" INTEGER NOT NULL,
  "remainingPoints" INTEGER NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointLot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PointLot_memberId_expiresAt_remainingPoints_idx" ON "PointLot"("memberId", "expiresAt", "remainingPoints");
CREATE INDEX "PointLot_sourceId_idx" ON "PointLot"("sourceId");
ALTER TABLE "PointLot" ADD CONSTRAINT "PointLot_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ClockState" (
  "id" INTEGER NOT NULL,
  "currentTime" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClockState_pkey" PRIMARY KEY ("id")
);
INSERT INTO "ClockState" ("id", "currentTime", "updatedAt") VALUES (1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutboxEvent_status_availableAt_createdAt_idx" ON "OutboxEvent"("status", "availableAt", "createdAt");
CREATE INDEX "OutboxEvent_aggregateId_createdAt_idx" ON "OutboxEvent"("aggregateId", "createdAt");
