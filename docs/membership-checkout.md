# Membership signup, UPI payments and approval

`/register` creates a MEMBER-role app account and an `ApplicantProfile`. It does
not create a gym Member, admission ID, QR token or membership. Guests can access
workouts and schedules. The home screen shows **No Active Plan**, profile details
and the membership shop. Attendance and the diet form stay gated. The free diet
form requires an active approved membership of at least three months.

Prices are defined centrally in `src/lib/membership-plans.ts`, in rupees:

| Package | 1 month | 3 months | 6 months | 1 year |
| --- | ---: | ---: | ---: | ---: |
| Male | 2000 | 4699 | 6499 | 9991 |
| Female | 1499 | 3999 | 5699 | 8999 |
| Female Happy Hours, 10 AM–4 PM | 1000 | 3000 | 4500 | 6000 |
| Regular renewal points cap | 100 | 300 | 500 | 700 |

Happy Hours never receives a points discount. New admissions do not receive a
points discount. On regular renewals, one point equals one rupee and the maximum
available points, capped by duration, are quoted automatically. Checkout itself
does not deduct points. Submitting the payment and UTR atomically creates a
negative point-ledger entry with a unique order reference. A repeated submission
does not deduct again. Rejection creates a unique reversal. Approval keeps the
original deduction; it does not deduct a second time.

## Payment behavior

The supplied merchant is **T B PATIL AND CO**, UPI
`9545405777@okbizaxis`. Each order has an amount-specific UPI URI and generated QR.
Choosing a plan opens `/membership/checkout/[orderId]`, separate from the plan
list. Checkout shows the saved amount, original Google Pay/PhonePe/Paytm logos,
UPI app buttons and QR. Other eligible plans remain visible while checkout is
unpaid. **Change plan** returns to those choices; switching atomically cancels
the old unpaid order and creates a new order with the new price and recalculated
points discount. Happy Hours retains zero discount. Submitted payments cannot
be switched without front-desk reconciliation.
**I have paid** opens a form containing only the 12-digit
UTR field. The server uses the saved checkout total; members do not re-enter it.
After saving the UTR, checkout opens a WhatsApp draft for **8999699811** with the
member, plan, duration, payment amount, discount and UTR. It asks the owner to
approve the admission or renewal as appropriate. The member sends the draft in
WhatsApp. The pending-review screen provides the same link for retrying a
cancelled app handoff; retrying submission never duplicates points deductions.
The universal UPI chooser is primary, with Google Pay, PhonePe and Paytm links
and a copyable UPI ID for manual payment. Named links depend on installed apps
and device support. The QR/manual path remains available.

This is a **direct UPI payment with manual bank-statement verification**, not an
automatically verified payment gateway. No gateway credentials were supplied.
An app return, UTR or member-reported amount is never trusted as bank confirmation.
For automatic payment status, a merchant gateway account, server-side order
creation, signed callbacks/webhooks and bank reconciliation must be integrated.
Do not activate memberships from an unsigned browser callback.

Orders persist in the database and resume after refresh or returning from UPI.
Cancelling an unpaid checkout leaves points unchanged. Submitted payments cannot
be cancelled by the member. Pending bank transactions should be resolved before
retrying. Debits for a cancelled/rejected order require front-desk reconciliation
or a bank refund; the app never promises an automatic refund. Legacy clients may
report a differing amount, but the admin cannot approve that mismatch.
UTRs must be 12 digits and unique across pending/approved app requests. Rejected
requests retain their reference for audit but release it for a corrected submission.
Canonical approval
also checks that the UTR was not previously recorded in the merchant ledger.

## Admin and membership records

`/admin/memberships` has separate admissions and renewals tabs, payment references,
profile details, expected/reported amounts, points, notes and bank-verification
confirmation. Only active admins can approve or reject.

In `MEMBERSHIP_SOURCE=supabase` mode the narrow database function
`approve_app_membership` writes canonical management records. It uses the same
admission counter, advisory lock and reserved fingerprint-ID exclusions as the
manager. New admissions link the original app account, preserving the password
and workouts, and receive the normal app QR. Renewals preserve the member and QR.
The payment reference, discount, reviewer audit and normal Google Sheets/device
sync jobs are recorded atomically. Renewal starts after the latest confirmed
period or on today's India business date if the previous period has expired.
Durations are calendar months. Existing memberships and legacy order tables
are retained; the new Prisma model maps to `AppMembershipPurchase` to avoid
colliding with an older database `MembershipOrder` table.

## Release and verification

Apply `prisma/migrations/20261029010000_membership_checkout/migration.sql` using
the migration-owner connection in `zenith_app` before deploying this code. The
migration grants the new tables and function to existing server logins that
already have User CRUD access; anonymous/browser roles receive no grants.
Do not run the migration using the limited runtime login or broaden its DDL
permissions. Keep existing deployment migration history intact.

For a targeted install against the database configured for localhost, use
`node scripts/apply-membership-checkout.cjs --development --apply` with the
migration-owner DIRECT_URL. This installs the SQL and records its checksum in
existing Prisma migration history within one transaction. It does not alter
existing member records and safely skips a fully installed checkout schema.
After installing, `node scripts/diagnose-membership-signup.cjs --development
--verify-create` verifies runtime signup/profile creation and rolls its synthetic
account back. An optional `--mobile=XXXXXXXXXX` checks account-existence flags
without printing names, credentials or the phone number.

Validation commands:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node scripts/check-membership-checkout.cjs
```

The last command uses DIRECT_URL and runs the new migration, a temporary
admission, canonical UPI payment, point-discount renewal, QR/account linking and
sync-job assertions in one transaction. It rolls everything back, including
schema changes and ID-counter changes. Run it before applying the migration,
because it intentionally expects the new tables to be absent.

Before public release, verify one real low-value payment and cancelled/back
navigation on physical Android/iOS devices with the owner's merchant account.
No real payment is initiated by automated tests.

## Localhost checks

Use `npm.cmd run dev` for localhost so source changes appear immediately.
A server started with `npm start`
serves the last build until rebuilt and restarted, including its public-file
inventory. `node scripts/check-local-membership-flow.cjs` verifies a running dev
server; add `--production` when testing an `npm start` server. It checks the
localhost server with one marked synthetic signup, removes that account and its
checkout in `finally`, and never launches UPI or sends a WhatsApp message.

Logout is an explicit POST action. GET `/api/auth/logout` only redirects to the
sign-in page and does not clear cookies, so link/browser prefetching cannot log a
member out. The guest dashboard uses a button rather than a prefetched logout
link. Session cookies retain the existing one-year duration.
