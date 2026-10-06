ALTER TABLE "MembershipOrder" ALTER COLUMN "visitorId" DROP NOT NULL;
ALTER TABLE "MembershipOrder" ADD COLUMN "memberId" UUID,
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ADMISSION',
  ADD COLUMN "category" TEXT,
  ADD COLUMN "startDate" DATE;
UPDATE "MembershipOrder" o SET "category" = p."category" FROM "MembershipPlan" p WHERE p."id" = o."planId";
CREATE INDEX "MembershipOrder_memberId_status_idx" ON "MembershipOrder"("memberId", "status");
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_owner_check" CHECK (("kind" = 'ADMISSION' AND "visitorId" IS NOT NULL AND "memberId" IS NULL) OR ("kind" = 'RENEWAL' AND "memberId" IS NOT NULL AND "visitorId" IS NULL));
CREATE TABLE "SheetsSyncJob" (
  "id" UUID NOT NULL, "key" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT, "result" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SheetsSyncJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SheetsSyncJob_key_key" ON "SheetsSyncJob"("key");
CREATE INDEX "SheetsSyncJob_status_createdAt_idx" ON "SheetsSyncJob"("status", "createdAt");
