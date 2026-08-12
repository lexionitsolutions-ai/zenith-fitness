CREATE TABLE "ScheduleSession" (
    "id" UUID NOT NULL,
    "day" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleSession_isActive_day_time_idx" ON "ScheduleSession"("isActive", "day", "time");

INSERT INTO "ScheduleSession" ("id", "day", "time", "name", "updatedAt") VALUES
(gen_random_uuid(), 1, '06:30', 'Zumba', CURRENT_TIMESTAMP),
(gen_random_uuid(), 1, '18:00', 'Zumba', CURRENT_TIMESTAMP),
(gen_random_uuid(), 2, '08:00', 'Functional', CURRENT_TIMESTAMP),
(gen_random_uuid(), 2, '18:00', 'Functional', CURRENT_TIMESTAMP),
(gen_random_uuid(), 2, '19:00', 'Functional', CURRENT_TIMESTAMP),
(gen_random_uuid(), 3, '06:00', 'Masters Batch', CURRENT_TIMESTAMP),
(gen_random_uuid(), 3, '07:00', 'Masters Batch', CURRENT_TIMESTAMP),
(gen_random_uuid(), 3, '18:00', 'Mobility', CURRENT_TIMESTAMP),
(gen_random_uuid(), 4, '08:00', 'Functional', CURRENT_TIMESTAMP),
(gen_random_uuid(), 4, '18:00', 'Functional', CURRENT_TIMESTAMP),
(gen_random_uuid(), 5, '06:00', 'Functional', CURRENT_TIMESTAMP),
(gen_random_uuid(), 5, '07:00', 'Masters Batch', CURRENT_TIMESTAMP),
(gen_random_uuid(), 5, '19:00', 'Masters Batch', CURRENT_TIMESTAMP),
(gen_random_uuid(), 6, '06:00', 'Mobility Training', CURRENT_TIMESTAMP),
(gen_random_uuid(), 6, '07:00', 'Yoga', CURRENT_TIMESTAMP),
(gen_random_uuid(), 6, '19:00', 'Yoga', CURRENT_TIMESTAMP);
