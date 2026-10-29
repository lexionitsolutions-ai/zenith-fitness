# Mobile startup and reopen reliability

Vercel Functions use Singapore (`sin1`) via `vercel.json` to colocate compute
with the configured Supabase pooler in `ap-southeast-1`. Static assets continue
to use Vercel's CDN. Region changes require a new deployment.

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

Member navigation now uses Next.js automatic prefetch with route loading
boundaries. Only the loading shell is prefetched for dynamic member tabs;
full database-backed pages are not force-prefetched. Staff navigation also uses
automatic prefetch. A shared
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

The home middleware redirects from the signed session without opening a database
connection; the destination still verifies account access against the database.
Session alias and active-account validation use one parameterized SQL join and
are deduplicated within each server render. Raw account, birthday, and payment
queries explicitly qualify the schema from DATABASE_URL; they never rely on a
pooled connection's search_path. An unqualified AppSessionAlias lookup reproduced
an intermittent 42P01 error with transaction pooling after schema consolidation.
Dashboard member/target/streak reads
and independent points queries run in parallel. Fitness-target selection prefers
active over completed goals in one ordered query, alongside the reward lookup.
Dashboard announcements stream separately so images cannot hold up membership
content. Each main member tab has a loading shell with usable navigation, and
the native notification bridge is downloaded only on native platforms.
The guest membership shop and streak-story dialog load in separate chunks; an
existing member's initial dashboard does not download either feature.

Staff and admin birthday reminders stream independently of their workspace and
navigation. The birthday query returns only the India-time three-day window.
Trainer summaries fetch only the latest BMI assessment and render 30 rows at a
time; search still covers the full list. Member lookup aggregates the points
balance in PostgreSQL instead of downloading ledger rows, and omits empty phone
alternatives so admission-ID searches cannot accidentally match another member.

Visited page segments remain in this browser's in-memory router cache for 30
seconds, so repeated tab taps reuse their content. This is the Next.js 15
experimental [staleTimes setting](https://nextjs.org/docs/app/api-reference/config/next-config-js/staleTimes).
Explicit refresh and logout invalidate snapshots; API authorization and writes
still check current database state. The Points read combines balance, names,
overall ranking and monthly ranking in one grouped query, preserving all ranks.

Read-only HTTP timing checks:

```powershell
node scripts/benchmark-app.cjs --output=output/speed-local.json
node scripts/benchmark-app.cjs --public --origin=https://zenith-fitness-theta.vercel.app --output=output/speed-public.json
node scripts/compare-startup-performance.cjs
node scripts/benchmark-app.cjs --staff --output=output/speed-staff.json
node scripts/benchmark-navigation.cjs --verify-cache --output=output/navigation-verified.json
```

The default check uses one existing active member and a temporary signed session
from the existing local environment. It never prints tokens or member responses.
It performs only GET requests and reports the first request and median of three
warmed requests. Public mode does not authenticate. These are HTTP timings,
including full response streaming, rather than browser paint/hydration metrics.
The comparison script alternates the working-tree dashboard service with `HEAD`
using the same member, clock, and pool. It checks identical business results and
reports medians from three paired samples; temporary baseline sources are removed.
The navigation script requires Playwright in the ignored `.zee-qa/browser-tools`
folder and installed Edge. It taps real member tabs with a mobile viewport,
records content-ready time and destination RSC request counts, then optionally
checks expiry, explicit refresh and logout using a temporary browser session.

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
