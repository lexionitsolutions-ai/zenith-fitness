-- AlterTable
ALTER TABLE "Announcement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BmiAssessment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Exercise" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ExerciseVideoCandidate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GymStation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MemberExerciseProgress" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MemberFitnessTarget" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MemberTarget" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MemberWorkoutAssignment" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationDelivery" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PointTransaction" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PushDevice" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkoutPlan" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkoutPlanDay" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkoutPlanExercise" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "MemberExerciseProgress_memberWorkoutAssignmentId_workoutPlanExe" RENAME TO "MemberExerciseProgress_memberWorkoutAssignmentId_workoutPla_key";
