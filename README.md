# Zenith Fitness

A production-oriented, mobile-first member PWA built with Next.js App Router, TypeScript, Tailwind, PostgreSQL, and Prisma. Phase one provides secure mobile/PIN authentication, idempotent legacy membership import, an admin import console, and a member dashboard.

## Local setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env` and replace every secret. `SESSION_SECRET` should be at least 32 random characters.
3. Create the database named `zenith_fitness` and update `DATABASE_URL` if needed.
4. Run `npm install`, `npm run db:generate`, `npm run db:migrate -- --name init`, and `npm run db:seed`.
5. Start with `npm run dev`, then open `http://localhost:3000`.

On Windows PowerShell systems that block script shims, use `npm.cmd` in place of `npm`.

## Environment

`DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_SHEETS_API_URL`, `IMPORT_API_SECRET`, `NEXT_PUBLIC_APP_NAME`, `ADMIN_MOBILE`, `ADMIN_PIN`, and `TEST_MEMBER_PIN` are documented in `.env.example`. Only the app name is browser-visible.

## Admin and member access

The seed creates an admin using `ADMIN_MOBILE` and `ADMIN_PIN`. Run the import from `/admin/import`. To provision an account for every imported member with a valid, unique mobile number, set `MEMBER_INITIAL_PIN` to a temporary password of at least eight characters and run the import. Members must change this password during first sign-in. Mobile numbers already used by staff or administrators are never replaced.

## Import sources

Choose **Import sample JSON** to import `src/data/sample-memberships.json`. It includes active, expired, upcoming, partial-payment, missing-mobile, invalid-date, and repeat-member scenarios. Re-running it updates the same source rows, demonstrating idempotency.

For Apps Script, configure `GOOGLE_SHEETS_API_URL`. The endpoint must return an array matching `RawMembershipRow`; if `IMPORT_API_SECRET` is set, it is sent server-to-server as `x-import-secret`. The URL and secret never reach the browser. Use **Test Sheets endpoint** before a live import.

## Commands

- `npm run dev` — local server
- `npm run build` — production build
- `npm run typecheck` — strict TypeScript check
- `npm test` — unit tests
- `npm run db:migrate -- --name init` — create/apply migration
- `npm run db:seed` — seed plans and admin

## Manual test checklist

- Sign in with wrong credentials five times and verify generic errors and temporary lockout.
- Sign in as admin; verify members cannot open `/admin/import`.
- Import sample JSON twice; verify the second batch updates rather than duplicates source rows.
- Inspect warnings for invalid mobile, plan, or dates; verify one bad row does not stop the batch.
- Sign in as a linked test member and verify membership priority, amounts, alerts, logout, and mobile widths at 360/390px.
- Open `/workout` as a member; select each supported fitness goal in a test account and verify beginner/intermediate assignment, dashboard stats, day cards, exercise video fallback, completion, undo, continue workout, history, and goal-change confirmation.
- Sign in as admin; open `/admin/workouts`, update an exercise video/instruction record, assign a member plan, and verify members cannot access admin workout routes.
- Verify unauthenticated dashboard/API access is rejected and cookies are HTTP-only.
- Test standalone installation; authenticated API responses are not service-worker cached.

## Current limitations and next step

This milestone still excludes OTP, full attendance reporting, online payments, diet plans, WhatsApp automation, and renewal processing. Workout plans now support seeded plan cards, member progress, and admin assignment, with temporary station/video placeholders until final Zenith media and equipment data are supplied. The manifest provides installable structure; a service worker is intentionally omitted to avoid insecure caching until an explicit offline asset strategy is approved. The recommended next step is audited OTP account provisioning, followed by staging deployment against Supabase PostgreSQL.

## QR points, staff, targets, and leaderboard

Members open `/points` to display their permanent opaque QR token, balance, transaction history, targets, and privacy-limited top-20 leaderboard. Staff sign in at `/login` and are redirected to `/staff`, where they can scan QR codes, award the fixed five daily points, assign targets with custom reward points, and complete a target for its assigned reward. Daily boundaries use `Asia/Kolkata`; database-unique reference keys prevent concurrent duplicate awards. Admins can inspect the ledger at `/admin/points` and use the protected points API for audited adjustments or reversals.

Set `STAFF_MOBILE` and `STAFF_PIN` in `.env`, then run `npm.cmd run db:seed` to create or update the staff account. Camera scanning requires localhost or HTTPS and browser camera permission. The common member PIN and staff PIN are development conveniences only and must be replaced by OTP/individual credentials before production.

See `docs/` for database, mapping, import, and API details.

Workout module design, schema, seed, station mapping, and API notes are documented in `docs/workout-module.md`.
Workout exercise videos are seeded from `src/data/workouts/exercises.normalized.json`; verified videos render through privacy-enhanced YouTube embeds, while owner-confirmation records remain hidden from members until approved.
