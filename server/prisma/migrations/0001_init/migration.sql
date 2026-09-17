CREATE TYPE "UserRole" AS ENUM ('STAFF', 'ADMIN');
CREATE TYPE "Tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');
CREATE TYPE "PointTransactionType" AS ENUM ('PURCHASE_EARN', 'REDEMPTION', 'ADJUSTMENT', 'REVERSAL');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE "Member" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fullName" TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "normalizedPhoneNumber" TEXT NOT NULL,
  "email" TEXT,
  "currentTier" "Tier" NOT NULL DEFAULT 'BRONZE',
  "lifetimeEarnedPoints" INTEGER NOT NULL DEFAULT 0,
  "currentPointsBalance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Member_normalizedPhoneNumber_key" ON "Member"("normalizedPhoneNumber");
CREATE INDEX "Member_createdAt_idx" ON "Member"("createdAt");
CREATE INDEX "Member_fullName_idx" ON "Member"("fullName");
CREATE INDEX "Member_currentTier_idx" ON "Member"("currentTier");
CREATE INDEX "Member_currentPointsBalance_idx" ON "Member"("currentPointsBalance");
CREATE INDEX "Member_lifetimeEarnedPoints_idx" ON "Member"("lifetimeEarnedPoints");

CREATE TABLE "Reward" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "pointsCost" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Reward_active_idx" ON "Reward"("active");

CREATE TABLE "Purchase" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "tierAtPurchase" "Tier" NOT NULL,
  "earningMultiplier" DECIMAL(4,2) NOT NULL,
  "pointsEarned" INTEGER NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Purchase_clientRequestId_key" ON "Purchase"("clientRequestId");
CREATE INDEX "Purchase_memberId_createdAt_idx" ON "Purchase"("memberId", "createdAt");
CREATE INDEX "Purchase_createdById_idx" ON "Purchase"("createdById");

CREATE TABLE "Redemption" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "rewardId" UUID NOT NULL,
  "pointsUsed" INTEGER NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Redemption_clientRequestId_key" ON "Redemption"("clientRequestId");
CREATE INDEX "Redemption_memberId_createdAt_idx" ON "Redemption"("memberId", "createdAt");
CREATE INDEX "Redemption_rewardId_idx" ON "Redemption"("rewardId");
CREATE INDEX "Redemption_createdById_idx" ON "Redemption"("createdById");

CREATE TABLE "PointLedger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "transactionType" "PointTransactionType" NOT NULL,
  "pointsDelta" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "referenceId" TEXT,
  "referenceType" TEXT,
  "description" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PointLedger_memberId_createdAt_idx" ON "PointLedger"("memberId", "createdAt");
CREATE INDEX "PointLedger_transactionType_idx" ON "PointLedger"("transactionType");
CREATE INDEX "PointLedger_referenceId_idx" ON "PointLedger"("referenceId");

CREATE TABLE "LoyaltyProgram" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "baseEarningRate" DECIMAL(8,4) NOT NULL,
  "bronzeThreshold" INTEGER NOT NULL,
  "silverThreshold" INTEGER NOT NULL,
  "goldThreshold" INTEGER NOT NULL,
  "bronzeMultiplier" DECIMAL(4,2) NOT NULL,
  "silverMultiplier" DECIMAL(4,2) NOT NULL,
  "goldMultiplier" DECIMAL(4,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LoyaltyProgram_name_key" ON "LoyaltyProgram"("name");
CREATE INDEX "LoyaltyProgram_active_idx" ON "LoyaltyProgram"("active");

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PointLedger" ADD CONSTRAINT "PointLedger_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
