CREATE TYPE "RenewalOrderStatus" AS ENUM ('PENDING_PAYMENT','PAYMENT_SUBMITTED','VERIFIED','REJECTED','CANCELLED');
CREATE TABLE "RenewalOrder" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "memberId" UUID NOT NULL, "planId" UUID NOT NULL,
  "planCode" TEXT NOT NULL, "planName" TEXT NOT NULL, "durationDays" INTEGER NOT NULL,
  "baseAmount" DECIMAL(12,2) NOT NULL, "pointsRedeemed" INTEGER NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, "payableAmount" DECIMAL(12,2) NOT NULL,
  "paymentReference" TEXT NOT NULL, "payerUtr" TEXT, "status" "RenewalOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "submittedAt" TIMESTAMP(3), "verifiedAt" TIMESTAMP(3), "verifiedByUserId" UUID,
  "rejectionReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RenewalOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RenewalOrder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RenewalOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RenewalOrder_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RenewalOrder_paymentReference_key" ON "RenewalOrder"("paymentReference");
CREATE UNIQUE INDEX "RenewalOrder_payerUtr_key" ON "RenewalOrder"("payerUtr");
CREATE INDEX "RenewalOrder_memberId_status_idx" ON "RenewalOrder"("memberId","status");
CREATE INDEX "RenewalOrder_status_createdAt_idx" ON "RenewalOrder"("status","createdAt");
