# Mobile startup and reopen reliability

Production logs showed Prisma P2024 while rendering `/points`: a function shared
one Prisma connection between simultaneous requests and exhausted its pool wait.
Member navigation could prefetch several database-backed pages while dashboard,
streak and visibility listeners also refreshed the same route on app resume.
Read-only checks of the reported accounts showed active, unlocked users and
successful dashboard calculations; no passwords or membership data were changed.

The runtime now uses three Prisma connections through the existing PgBouncer
transaction pooler, preserving TLS and schema settings. Non-pooled connections
remain conservative. `DATABASE_POOL_SIZE` explicitly overrides the runtime pool
with a bounded value from 1 to 10 if operations needs to tune it. A URL parameter
of `connection_limit=1` is overridden for PgBouncer runtime traffic; it remains
appropriate for scripts and the separate migration connection. No database
privilege changes or DDL are part of this fix.

Member and staff bottom navigation disables speculative prefetch. A shared
five-second gate coalesces resume/focus/streak route refreshes. Membership polling
coalesces in-flight requests, and announcements use the server-rendered data
instead of immediately fetching it a second time. The BMI reminder is shown in
the dashboard card rather than a blocking native confirm dialog at startup.

Root loading and error boundaries show progress or an explicit retry/reload
screen. Network reconnection and browser back/forward restoration refresh the
current page without logging out. Recognized outdated-chunk failures reload once
per minute when online; blocked storage disables automatic reload rather than
creating a loop. Optional browser storage is guarded against SecurityError and
QuotaExceededError. Zee's initial rendering avoids Array.findLastIndex for older
Android WebViews.

Checks:

```powershell
npm.cmd test
npm.cmd run build
node scripts/diagnose-app-startup.cjs --concurrent '--name=Full member name'
node scripts/check-local-membership-flow.cjs --production
```

The named diagnostic is read-only and outputs status/timing flags. It does not
select credentials, contacts or medical details. Physical iPhone/Android resume
and app-update behavior still needs confirmation on the affected devices after
deployment.
