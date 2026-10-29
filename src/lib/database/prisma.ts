import { PrismaClient } from "@prisma/client";
import { runtimeDatabaseUrl } from "./runtime-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatabaseUrl() {
  return runtimeDatabaseUrl(process.env.DATABASE_URL, process.env.NODE_ENV === "production", process.env.DATABASE_POOL_SIZE);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

globalForPrisma.prisma = prisma;
