# Database design

`Member` is unique by business identifier (`admissionId`) and may have many immutable membership cycles. `User` is a one-to-one optional login identity. `Membership` is idempotent by `(sourceSheet, sourceRow)` and references a seeded plan when recognized. Batch and row logs retain JSON provenance and safe diagnostics. UUID keys and PostgreSQL decimals support later API extraction and Supabase deployment.
