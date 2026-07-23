ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

CREATE TYPE "PointTransactionType" AS ENUM ('DAILY_VISIT','TARGET_COMPLETION','ADMIN_ADJUSTMENT','REVERSAL');
CREATE TYPE "TargetStatus" AS ENUM ('ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED');

ALTER TABLE "Member"
ADD COLUMN "qrToken" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "qrCodeActive" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "Member_qrToken_key" ON "Member"("qrToken");

CREATE TABLE "PointTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "points" INTEGER NOT NULL,
  "transactionType" "PointTransactionType" NOT NULL,
  "referenceKey" TEXT,
  "description" TEXT NOT NULL,
  "awardedByUserId" UUID,
  "businessDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PointTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PointTransaction_awardedByUserId_fkey" FOREIGN KEY ("awardedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PointTransaction_referenceKey_key" ON "PointTransaction"("referenceKey");
CREATE INDEX "PointTransaction_memberId_createdAt_idx" ON "PointTransaction"("memberId","createdAt");
CREATE INDEX "PointTransaction_businessDate_transactionType_idx" ON "PointTransaction"("businessDate","transactionType");

CREATE TABLE "MemberTarget" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetValue" DECIMAL(12,2),
  "unit" TEXT,
  "startDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "status" "TargetStatus" NOT NULL DEFAULT 'ASSIGNED',
  "rewardPoints" INTEGER NOT NULL DEFAULT 250,
  "assignedByUserId" UUID NOT NULL,
  "completedByUserId" UUID,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberTarget_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MemberTarget_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberTarget_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "MemberTarget_memberId_status_idx" ON "MemberTarget"("memberId","status");
