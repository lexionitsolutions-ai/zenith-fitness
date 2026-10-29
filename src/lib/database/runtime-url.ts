/** A small pool for concurrent requests sharing one serverless instance. */
export function runtimeDatabaseUrl(raw: string | undefined, production: boolean, poolSize?: string) {
  if (!raw || !production) return raw;
  const url = new URL(raw);
  const override = Number(poolSize);
  if (Number.isInteger(override) && override >= 1 && override <= 10) {
    url.searchParams.set("connection_limit", String(override));
  } else if (url.searchParams.get("pgbouncer") === "true") {
    // Supabase's transaction pooler brokers database connections. A single
    // Prisma connection here was serializing unrelated mobile requests (P2024).
    url.searchParams.set("connection_limit", "3");
  } else if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", "1");
  }
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "10");
  return url.toString();
}
