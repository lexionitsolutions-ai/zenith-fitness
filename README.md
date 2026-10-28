# Zenith Fitness member app

Mobile-first member PWA and native wrapper built with Next.js, TypeScript,
Tailwind, PostgreSQL and Prisma. The hosted app uses the same Supabase project
as the Zenith membership manager.

## Automatic memberships

Supabase is the source of truth. New admissions, renewals, payment collections,
refunds and member corrections update the app automatically in the management
write's database transaction. **Do not re-import Google Sheets.** The dashboard
refreshes every 60 seconds while visible and when returning to the app.

App accounts, passwords, QR codes, points, workout assignments, targets and
announcements are preserved in the private `zenith_app` schema. The management
tables remain in `public`. Linked members use canonical membership periods;
older imported cycles remain stored as history. Payment amounts awaiting
reconciliation are not displayed as verified dues. Membership dates use
`Asia/Kolkata`.

The admin page `/admin/import` now shows the automatic connection and a
repeat-safe verification action. Former Sheets/sample import writes are blocked.
New members with a valid unique phone receive the configured initial temporary
password and must replace it on first login. Existing passwords are never reset
by membership sync.

## Configuration and setup

Use Node.js 24 and `npm.cmd` on Windows. Copy `.env.example` to a private `.env`.
All connection strings and credentials are server-only; none use a
`NEXT_PUBLIC_` prefix. Only the display app name is browser-visible.

- `DATABASE_URL`: Supabase transaction pooler, port 6543, with
  `schema=zenith_app&pgbouncer=true&connection_limit=1&sslmode=require`.
- `DIRECT_URL`: session pooler, port 5432, for the migration owner. The hosted
  runtime uses a limited account and does not apply DDL on requests.
- `MEMBERSHIP_SOURCE=supabase` enables read-only operational-schema validation.
- Preserve `SESSION_SECRET`, existing account hashes and app record IDs during
  migration. Do not run seeds against existing accounts to connect the database.
- Preserve the configured `MEMBER_INITIAL_PIN` for provisioning new accounts;
  its hash is stored in the private, runtime-protected sync configuration.

See [database connection and deployment](docs/supabase-connection.md) for the
one-time migration, backup, permissions and recovery procedure. Do not apply the
app migrations to the management system's `public` schema. The read-only public
`/api/health` endpoint verifies connection readiness without exposing member data.

## Validation

- `npm run typecheck` — TypeScript validation
- `npm test` — unit tests
- `npm run build` — production build and generated Prisma client
- `prisma/tests/management-sync.sql` — rollback-only automatic-sync regression
- `prisma/tests/management-rpc-smoke.sql` — rollback-only authenticated source RPC

The old Sheets import regression suite is retained for historical data mapping
and runs only when `TEST_DATABASE_URL` is explicitly configured.

## Member and staff features

Members can view current memberships, balances, announcements, schedules,
workouts, progress, BMI/fitness targets, points, QR codes and rankings. Staff can
scan QR codes, award daily visit points and manage targets. Admin tools manage
accounts, schedules, announcements, workouts, notifications and points.

Native push uses the existing Firebase configuration. See `docs/` for module
details and `docs/workout-module.md` for workout/video setup. Account access is
checked by the existing session and role controls; the database connection does
not make member data publicly accessible.
