CREATE TABLE "FunctionalExercise" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL, "videoUrl" text NOT NULL, "youtubeVideoId" text,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "FunctionalBatch" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "sourceKey" text UNIQUE,
  "title" text NOT NULL, "description" text, "rounds" integer NOT NULL DEFAULT 1 CHECK ("rounds" BETWEEN 1 AND 20),
  "scheduledAt" timestamp(3), "active" boolean NOT NULL DEFAULT true,
  "createdById" uuid REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FunctionalBatch_active_createdAt_idx" ON "FunctionalBatch"("active", "createdAt");
CREATE TABLE "FunctionalBatchExercise" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "batchId" uuid NOT NULL REFERENCES "FunctionalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "exerciseId" uuid NOT NULL REFERENCES "FunctionalExercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "sortOrder" integer NOT NULL, "workSeconds" integer NOT NULL DEFAULT 40 CHECK ("workSeconds" BETWEEN 5 AND 600),
  "restSeconds" integer NOT NULL DEFAULT 20 CHECK ("restSeconds" BETWEEN 0 AND 300),
  "repetitions" integer CHECK ("repetitions" BETWEEN 1 AND 1000),
  CONSTRAINT "FunctionalBatchExercise_batchId_sortOrder_key" UNIQUE ("batchId", "sortOrder")
);
CREATE INDEX "FunctionalBatchExercise_exerciseId_idx" ON "FunctionalBatchExercise"("exerciseId");
REVOKE ALL ON "FunctionalExercise","FunctionalBatch","FunctionalBatchExercise" FROM PUBLIC;
DO $$ DECLARE runtime_role text; BEGIN
 FOR runtime_role IN SELECT rolname FROM pg_roles WHERE rolcanlogin AND NOT rolsuper
  AND rolname NOT IN ('anon','authenticated','authenticator')
  AND has_schema_privilege(rolname,current_schema(),'USAGE')
  AND has_table_privilege(rolname,'"User"','SELECT')
  AND has_table_privilege(rolname,'"User"','INSERT')
  AND has_table_privilege(rolname,'"User"','UPDATE') LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON "FunctionalExercise","FunctionalBatch","FunctionalBatchExercise" TO %I',runtime_role);
 END LOOP;
END $$;
