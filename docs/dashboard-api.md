# Dashboard API

`GET /api/member/dashboard` uses only the HTTP-only session identity; it accepts no member identifier. Selection order is latest-ending active, earliest-starting upcoming, then most recently expired. The service returns normalized member, membership, payment, alerts, and data warnings. Dates are ISO date strings and amounts are numbers. Multiple active memberships remain intact and generate a warning.

Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }` and do not expose internal details.
