# Import process

The browser invokes an admin-only internal route. That route selects a local JSON or backend-only Apps Script adapter. A batch is opened and every nonblank row runs in its own Prisma transaction: validate, normalize, upsert nonblank member fields, resolve plan, upsert the source row, calculate statuses, and log the result. Failures are isolated. Final counters distinguish new, updated, skipped, warning, and failed rows. Repeating the same sheet/row updates it and never creates another membership.
