# Automatic membership connection

The membership manager's `public.members`, `memberships`, `membership_plans`,
`payments` and `member_private_details` are the source of truth for Zenith gym
`b80cd818-2abe-4a90-9027-e2ba1916aec4`. App-specific accounts, QR tokens, workouts,
targets, points, announcements and import history live in the private
`zenith_app` PostgreSQL schema in that same Supabase project.

Database triggers copy each admission, renewal, correction, payment and refund
into the member app in the original write's transaction. No Sheets import,
webhook delivery or scheduled worker is required. The dashboard refreshes every
60 seconds while visible and when the user returns to the app. Old imported
cycles remain as history; linked members use only the canonical periods for
membership and daily-points eligibility. Unreconciled financial data is not
presented as a verified balance.

Existing app member/user IDs, passwords, QR tokens, points and workout relations
are preserved. Valid unique phones on new members get an account using the
configured temporary-password hash; first login requires a password change.
Missing/duplicate phones never take over an existing account. Archived members
are disabled; staff and admin accounts are not automatically recreated or reset.
Member profile edits and admin phone corrections sync back into the canonical
profile and queue normal Sheets/device refreshes. Profile sync does not assign
admission IDs or write payment records.

## Deployment

1. Back up the current app database and source profiles. Restore the existing
   app tables, data and migration history into `zenith_app`, never into `public`.
2. Use `DATABASE_URL` with transaction pooling (6543), `schema=zenith_app`,
   `pgbouncer=true`, `connection_limit=1` and TLS. Use `DIRECT_URL` with session
   pooling (5432) for migrations. Keep both server-only.
3. Run the `20261028010000_connect_membership_manager` migration in this schema.
   On a restored database, retain existing migration history rather than
   reapplying the original table-creation migrations.
4. Preserve app profile fields absent from the old management import before the
   first canonical refresh. Set the server-only `ManagementSyncConfig` initial
   password hash from the existing `MEMBER_INITIAL_PIN`, without resetting users.
5. Run `SELECT zenith_app.sync_management_all()` once, then the rollback-only
   checks in `prisma/tests/management-sync.sql`. Verify member/QR/password/workout
   counts against the backup.
6. Grant the runtime login CRUD on app tables, but no DDL, no direct public-table
   access and no configuration edits. Only the owner runs migrations. Keep the
   schema out of Supabase exposed schemas and revoke browser-role access.
7. Set `MEMBERSHIP_SOURCE=supabase` in Vercel and deploy. `/api/health` confirms
   connectivity without exposing member data. `/admin/import` now shows the
   automatic connection and an admin-only repeat-safe verification action.

The recovery action is not required after admissions or renewals. The previous
Sheets/sample import APIs reject writes so stale exports cannot replace current
data. The original local DB backup remains available for rollback.

## Existing production accounts

The prior production Supabase database is reconciled separately from the local
development backup. Match members by admission ID and retain production IDs,
password hashes, QR tokens, ledger transactions, targets and workout history.
Never reset established passwords to the shared temporary password. A password
explicitly changed on the new live app during migration takes precedence over
its older production hash. Compare hashes privately; do not log or commit them.

`AppSessionAlias`, `AppQrAlias` and `AppLoginAlias` retain compatibility for
interim sessions, QR tokens and existing login numbers after ID reconciliation.
Aliases cannot change a session's role/member or reactivate a disabled account.
Source memberships/payment ledgers remain unchanged. Deduplicate reward keys
after identity mapping so an initial BMI award is not counted twice.
