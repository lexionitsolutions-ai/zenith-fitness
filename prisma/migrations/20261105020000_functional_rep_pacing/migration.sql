ALTER TABLE "FunctionalExercise"
  ADD COLUMN "videoStartSeconds" integer NOT NULL DEFAULT 0 CHECK ("videoStartSeconds" >= 0),
  ADD COLUMN "videoEndSeconds" integer,
  ADD COLUMN "videoLayout" text NOT NULL DEFAULT 'FIT' CHECK ("videoLayout" IN ('FIT', 'CENTER_CROP')),
  ADD CONSTRAINT "FunctionalExercise_clip_bounds" CHECK ("videoEndSeconds" IS NULL OR "videoEndSeconds" > "videoStartSeconds");
ALTER TABLE "FunctionalBatchExercise"
  ADD COLUMN "repsPerSecond" double precision NOT NULL DEFAULT 0.5 CHECK ("repsPerSecond" >= 0.1 AND "repsPerSecond" <= 5);
