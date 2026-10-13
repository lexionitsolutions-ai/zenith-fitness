CREATE TABLE "RenewalRequest" (
 "id" UUID NOT NULL, "memberId" UUID NOT NULL, "reference" TEXT NOT NULL,
 "planCode" TEXT NOT NULL, "planName" TEXT NOT NULL, "category" TEXT NOT NULL,
 "durationDays" INTEGER NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "utr" TEXT, "submittedAt" TIMESTAMP(3),
 "reviewedById" UUID, "reviewedAt" TIMESTAMP(3), "rejectionReason" TEXT,
 "membershipId" UUID, "startDate" DATE, "endDate" DATE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RenewalRequest_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RenewalRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "RenewalRequest_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED')),
 CONSTRAINT "RenewalRequest_amount_check" CHECK ("amount" > 0),
 CONSTRAINT "RenewalRequest_duration_check" CHECK ("durationDays" IN (30,90,180,365))
);
CREATE UNIQUE INDEX "RenewalRequest_reference_key" ON "RenewalRequest"("reference");
CREATE UNIQUE INDEX "RenewalRequest_utr_key" ON "RenewalRequest"("utr");
CREATE UNIQUE INDEX "RenewalRequest_membershipId_key" ON "RenewalRequest"("membershipId");
CREATE UNIQUE INDEX "RenewalRequest_one_open_per_member" ON "RenewalRequest"("memberId") WHERE "status" IN ('DRAFT','SUBMITTED');
CREATE INDEX "RenewalRequest_status_createdAt_idx" ON "RenewalRequest"("status","createdAt");
CREATE INDEX "RenewalRequest_memberId_createdAt_idx" ON "RenewalRequest"("memberId","createdAt");
CREATE TABLE "RenewalSheetsJob" (
 "id" UUID NOT NULL, "requestId" UUID NOT NULL, "key" TEXT NOT NULL,
 "kind" TEXT NOT NULL DEFAULT 'RENEWAL', "payload" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
 "lastError" TEXT, "result" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RenewalSheetsJob_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RenewalSheetsJob_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RenewalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RenewalSheetsJob_requestId_key" ON "RenewalSheetsJob"("requestId");
CREATE UNIQUE INDEX "RenewalSheetsJob_key_key" ON "RenewalSheetsJob"("key");
CREATE INDEX "RenewalSheetsJob_status_createdAt_idx" ON "RenewalSheetsJob"("status","createdAt");
