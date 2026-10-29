import { Prisma } from "@prisma/client";

/** Raw SQL must not rely on a transaction pooler's connection search_path. */
export function appDatabaseObject(name: "User" | "AppSessionAlias" | "Member" | "PointTransaction" | "approve_app_membership", databaseUrl = process.env.DATABASE_URL) {
  const schema = databaseUrl ? new URL(databaseUrl).searchParams.get("schema") || "public" : "public";
  const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
  // Only identifiers are composed here. All request values remain bound parameters.
  return Prisma.raw(`${quote(schema)}.${quote(name)}`);
}
