CREATE TYPE "FitnessGoal" AS ENUM ('WEIGHT_LOSS', 'WEIGHT_GAIN', 'GENERAL_FITNESS', 'BUILD_ENDURANCE');
CREATE TYPE "WorkoutLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "ExerciseType" AS ENUM ('WARM_UP', 'STRENGTH', 'CARDIO', 'CORE', 'FINISHER', 'BODYWEIGHT', 'STEPPER', 'DUMBBELL', 'BARBELL', 'CABLE', 'TRX', 'MACHINE', 'FREE_WEIGHT');
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'REPLACED');

CREATE TABLE "GymStation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stationCode" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "machineName" TEXT,
  "location" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GymStation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Exercise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "safetyInstructions" TEXT,
  "videoUrl" TEXT,
  "thumbnailUrl" TEXT,
  "exerciseType" "ExerciseType" NOT NULL,
  "equipmentType" TEXT,
  "stationId" UUID,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "level" "WorkoutLevel" NOT NULL,
  "description" TEXT,
  "totalDays" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlanDay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workoutPlanId" UUID NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "estimatedMinutes" INTEGER,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "WorkoutPlanDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutPlanExercise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workoutPlanDayId" UUID NOT NULL,
  "exerciseId" UUID NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "sectionName" TEXT NOT NULL,
  "sets" INTEGER,
  "reps" INTEGER,
  "minimumReps" INTEGER,
  "maximumReps" INTEGER,
  "holdSeconds" INTEGER,
  "restSeconds" INTEGER,
  "notes" TEXT,
  "alternativeGroup" TEXT,
  CONSTRAINT "WorkoutPlanExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberWorkoutAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL,
  "workoutPlanId" UUID NOT NULL,
  "fitnessGoal" "FitnessGoal" NOT NULL,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "assignedById" UUID,
  "currentDay" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "MemberWorkoutAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberExerciseProgress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "memberWorkoutAssignmentId" UUID NOT NULL,
  "workoutPlanExerciseId" UUID NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "actualSets" INTEGER,
  "actualReps" INTEGER,
  "notes" TEXT,
  "selected" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberExerciseProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymStation_stationCode_key" ON "GymStation"("stationCode");
CREATE INDEX "GymStation_stationCode_idx" ON "GymStation"("stationCode");
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");
CREATE INDEX "Exercise_slug_idx" ON "Exercise"("slug");
CREATE INDEX "Exercise_stationId_idx" ON "Exercise"("stationId");
CREATE UNIQUE INDEX "WorkoutPlan_slug_key" ON "WorkoutPlan"("slug");
CREATE INDEX "WorkoutPlan_level_active_idx" ON "WorkoutPlan"("level", "active");
CREATE UNIQUE INDEX "WorkoutPlanDay_workoutPlanId_dayNumber_key" ON "WorkoutPlanDay"("workoutPlanId", "dayNumber");
CREATE INDEX "WorkoutPlanDay_workoutPlanId_sortOrder_idx" ON "WorkoutPlanDay"("workoutPlanId", "sortOrder");
CREATE UNIQUE INDEX "WorkoutPlanExercise_workoutPlanDayId_sortOrder_key" ON "WorkoutPlanExercise"("workoutPlanDayId", "sortOrder");
CREATE INDEX "WorkoutPlanExercise_workoutPlanDayId_sortOrder_idx" ON "WorkoutPlanExercise"("workoutPlanDayId", "sortOrder");
CREATE INDEX "WorkoutPlanExercise_exerciseId_idx" ON "WorkoutPlanExercise"("exerciseId");
CREATE INDEX "MemberWorkoutAssignment_memberId_status_idx" ON "MemberWorkoutAssignment"("memberId", "status");
CREATE INDEX "MemberWorkoutAssignment_workoutPlanId_idx" ON "MemberWorkoutAssignment"("workoutPlanId");
CREATE UNIQUE INDEX "MemberExerciseProgress_memberWorkoutAssignmentId_workoutPlanExerciseId_key" ON "MemberExerciseProgress"("memberWorkoutAssignmentId", "workoutPlanExerciseId");
CREATE INDEX "MemberExerciseProgress_memberWorkoutAssignmentId_completed_idx" ON "MemberExerciseProgress"("memberWorkoutAssignmentId", "completed");
CREATE INDEX "MemberExerciseProgress_workoutPlanExerciseId_idx" ON "MemberExerciseProgress"("workoutPlanExerciseId");

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "GymStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlanDay" ADD CONSTRAINT "WorkoutPlanDay_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_workoutPlanDayId_fkey" FOREIGN KEY ("workoutPlanDayId") REFERENCES "WorkoutPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberWorkoutAssignment" ADD CONSTRAINT "MemberWorkoutAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberWorkoutAssignment" ADD CONSTRAINT "MemberWorkoutAssignment_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberWorkoutAssignment" ADD CONSTRAINT "MemberWorkoutAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberExerciseProgress" ADD CONSTRAINT "MemberExerciseProgress_memberWorkoutAssignmentId_fkey" FOREIGN KEY ("memberWorkoutAssignmentId") REFERENCES "MemberWorkoutAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberExerciseProgress" ADD CONSTRAINT "MemberExerciseProgress_workoutPlanExerciseId_fkey" FOREIGN KEY ("workoutPlanExerciseId") REFERENCES "WorkoutPlanExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
