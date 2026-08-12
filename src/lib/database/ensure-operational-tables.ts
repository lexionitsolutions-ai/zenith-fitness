import { prisma } from "@/lib/database/prisma";

let checked = false;

export async function ensureOperationalTables() {
  if (checked) return;

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PasswordResetRequest" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL,
      "requestedByMobile" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "handledById" UUID,
      "handledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetRequest_status_createdAt_idx" ON "PasswordResetRequest"("status", "createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetRequest_userId_status_idx" ON "PasswordResetRequest"("userId", "status")`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ScheduleSession" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "day" INTEGER NOT NULL,
      "time" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScheduleSession_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ScheduleSession_isActive_day_time_idx" ON "ScheduleSession"("isActive", "day", "time")`);
  await prisma.$executeRawUnsafe(`
    INSERT INTO "ScheduleSession" ("id", "day", "time", "name", "updatedAt")
    SELECT gen_random_uuid(), row.day, row.time, row.name, CURRENT_TIMESTAMP
    FROM (VALUES
      (1, '06:30', 'Zumba'),
      (1, '18:00', 'Zumba'),
      (2, '08:00', 'Functional'),
      (2, '18:00', 'Functional'),
      (2, '19:00', 'Functional'),
      (3, '06:00', 'Masters Batch'),
      (3, '07:00', 'Masters Batch'),
      (3, '18:00', 'Mobility'),
      (4, '08:00', 'Functional'),
      (4, '18:00', 'Functional'),
      (5, '06:00', 'Functional'),
      (5, '07:00', 'Masters Batch'),
      (5, '19:00', 'Masters Batch'),
      (6, '06:00', 'Mobility Training'),
      (6, '07:00', 'Yoga'),
      (6, '19:00', 'Yoga')
    ) AS row(day, time, name)
    WHERE NOT EXISTS (SELECT 1 FROM "ScheduleSession")
  `);

  checked = true;
}
