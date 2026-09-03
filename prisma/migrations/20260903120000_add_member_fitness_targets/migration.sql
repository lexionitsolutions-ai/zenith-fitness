CREATE TYPE "FitnessTargetGoalType" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN');
CREATE TYPE "FitnessTargetStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BmiAssessmentSource" AS ENUM ('MEMBER_ENTERED_BMI_REPORT');

ALTER TYPE "PointTransactionType" ADD VALUE 'INITIAL_BMI_TARGET_SETUP';

CREATE TABLE "MemberFitnessTarget" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memberId" UUID NOT NULL,
    "goalType" "FitnessTargetGoalType" NOT NULL,
    "baselineBmiAssessmentId" UUID,
    "baselineWeightKg" DECIMAL(6,2) NOT NULL,
    "baselineMuscleMassKg" DECIMAL(6,2) NOT NULL,
    "targetWeightKg" DECIMAL(6,2),
    "targetMuscleMassKg" DECIMAL(6,2),
    "startDate" DATE NOT NULL,
    "targetEndDate" DATE NOT NULL,
    "status" "FitnessTargetStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "lastReminderShownAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberFitnessTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BmiAssessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "memberId" UUID NOT NULL,
    "fitnessTargetId" UUID NOT NULL,
    "assessmentNumber" INTEGER NOT NULL,
    "assessmentDate" DATE NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "skeletalMuscleMassKg" DECIMAL(6,2) NOT NULL,
    "fatMassKg" DECIMAL(6,2) NOT NULL,
    "bodyFatPercentage" DECIMAL(5,2) NOT NULL,
    "source" "BmiAssessmentSource" NOT NULL DEFAULT 'MEMBER_ENTERED_BMI_REPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BmiAssessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberFitnessTarget_baselineBmiAssessmentId_key" ON "MemberFitnessTarget"("baselineBmiAssessmentId");
CREATE INDEX "MemberFitnessTarget_memberId_status_idx" ON "MemberFitnessTarget"("memberId", "status");
CREATE UNIQUE INDEX "BmiAssessment_fitnessTargetId_assessmentNumber_key" ON "BmiAssessment"("fitnessTargetId", "assessmentNumber");
CREATE INDEX "BmiAssessment_memberId_assessmentDate_idx" ON "BmiAssessment"("memberId", "assessmentDate");
CREATE INDEX "BmiAssessment_fitnessTargetId_assessmentDate_idx" ON "BmiAssessment"("fitnessTargetId", "assessmentDate");

ALTER TABLE "MemberFitnessTarget" ADD CONSTRAINT "MemberFitnessTarget_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberFitnessTarget" ADD CONSTRAINT "MemberFitnessTarget_baselineBmiAssessmentId_fkey" FOREIGN KEY ("baselineBmiAssessmentId") REFERENCES "BmiAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BmiAssessment" ADD CONSTRAINT "BmiAssessment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BmiAssessment" ADD CONSTRAINT "BmiAssessment_fitnessTargetId_fkey" FOREIGN KEY ("fitnessTargetId") REFERENCES "MemberFitnessTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
