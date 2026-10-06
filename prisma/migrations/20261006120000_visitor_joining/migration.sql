

-- CreateTable
CREATE TABLE "Visitor" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "memberId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialEnquiry" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "trialDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipOrder" (
    "id" UUID NOT NULL,
    "visitorId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "planName" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "utr" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "membershipId" UUID,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_mobileNumber_key" ON "Visitor"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_memberId_key" ON "Visitor"("memberId");

-- CreateIndex
CREATE INDEX "TrialEnquiry_contact_createdAt_idx" ON "TrialEnquiry"("contact", "createdAt");

-- CreateIndex
CREATE INDEX "TrialEnquiry_status_trialDate_idx" ON "TrialEnquiry"("status", "trialDate");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipOrder_reference_key" ON "MembershipOrder"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipOrder_utr_key" ON "MembershipOrder"("utr");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipOrder_membershipId_key" ON "MembershipOrder"("membershipId");

-- CreateIndex
CREATE INDEX "MembershipOrder_visitorId_status_idx" ON "MembershipOrder"("visitorId", "status");

-- CreateIndex
CREATE INDEX "MembershipOrder_status_createdAt_idx" ON "MembershipOrder"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipOrder" ADD CONSTRAINT "MembershipOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
