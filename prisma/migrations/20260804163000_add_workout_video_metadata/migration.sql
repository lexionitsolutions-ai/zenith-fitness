CREATE TYPE "ExerciseVideoStatus" AS ENUM ('VERIFIED', 'NEEDS_OWNER_CONFIRMATION', 'NO_SUITABLE_VIDEO', 'NOT_EMBEDDABLE');

ALTER TABLE "Exercise"
  ADD COLUMN "externalId" INTEGER,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "primaryMuscles" JSONB,
  ADD COLUMN "equipment" TEXT,
  ADD COLUMN "difficulty" TEXT,
  ADD COLUMN "movementType" TEXT,
  ADD COLUMN "videoStatus" "ExerciseVideoStatus" NOT NULL DEFAULT 'NEEDS_OWNER_CONFIRMATION',
  ADD COLUMN "youtubeVideoId" TEXT,
  ADD COLUMN "videoTitle" TEXT,
  ADD COLUMN "videoChannel" TEXT,
  ADD COLUMN "videoDuration" TEXT,
  ADD COLUMN "duplicateVideoOfId" UUID,
  ADD COLUMN "notes" TEXT;

CREATE TABLE "ExerciseVideoCandidate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "exerciseId" UUID NOT NULL,
  "youtubeId" TEXT NOT NULL,
  "title" TEXT,
  "channel" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseVideoCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Exercise_externalId_key" ON "Exercise"("externalId");
CREATE INDEX "Exercise_videoStatus_idx" ON "Exercise"("videoStatus");
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");
CREATE INDEX "Exercise_youtubeVideoId_idx" ON "Exercise"("youtubeVideoId");
CREATE UNIQUE INDEX "ExerciseVideoCandidate_exerciseId_youtubeId_key" ON "ExerciseVideoCandidate"("exerciseId", "youtubeId");
CREATE INDEX "ExerciseVideoCandidate_exerciseId_idx" ON "ExerciseVideoCandidate"("exerciseId");

ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_duplicateVideoOfId_fkey" FOREIGN KEY ("duplicateVideoOfId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseVideoCandidate" ADD CONSTRAINT "ExerciseVideoCandidate_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
