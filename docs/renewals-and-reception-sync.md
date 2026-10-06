# UPI renewals and reception Sheets

Members can open `/renew` from their dashboard. The renewal card is highlighted for expired memberships and those with 15 days or less remaining. Members select a priced plan and a start date, pay through the existing UPI checkout, and submit their UTR for admin review. Their login and admission ID are retained. Admin reviews both admissions and renewals at `/admin/joining`.

## Dates

Both admission and renewal start dates default to today in Asia/Kolkata and may be changed to a real past date. Future dates are rejected by the server, not just the date input. The end date is calculated on the server as **start + plan duration in days**, matching the supplied reception `script.js` and `renewal.js`. Members cannot submit or edit an end date, amount, member ID or an approved record. Dates and prices are fixed on the order; approval preserves the chosen start date rather than replacing it with the approval date. Backdated periods can already be expired when approved; the admin sees the complete period before confirmation.

An early renewal starts on the selected date; remaining days are not automatically added and the start is not shifted into the future. Existing historical membership cycles are retained.

## Reception integration

The backend uses the existing Apps Script actions and URL-encoded form fields:

- Approved admissions → `admission` → `1 Month`, `3 Months`, `6 Months` or `1 Year`.
- Approved renewals → `saveRenewal` → `Renewals 1M`, `Renewals 3M`, `Renewals 6M` or `Renewals 1Y`.
- Trial enquiries → `enquire`, immediately after submitting the three-field enquiry. The requested trial date maps to `followUpDate`; source is `Zenith Fitness App`.

The reception script supplied with the UI assigns the real admission ID and maintains its existing cashbook and post-processing queue. The app does not send WhatsApp messages or provision fingerprint hardware. `FEMALE_HAPPY_HOURS` maps to reception's `Happy Hours` category; regular male/female packages map to `Regular` with the corresponding gender. UPI payments are marked paid only following admin verification.

Server-only optional overrides are `GOOGLE_SHEETS_WRITE_URL` and `GOOGLE_SHEETS_ENQUIRY_URL`. Empty overrides use the deployed URLs supplied in the reception `script.js` and `enquire.js`, which are different deployments. They are independent of the existing import endpoint. No Apps Script redeployment is required if the live deployments match the supplied handlers.

## Durable delivery and retries

Approval and the Sheets job are committed in one database transaction. Enquiry and its job are also committed together. The app then sends the job to reception. Each approved membership has a unique `ZenithApp:<order-reference>` marker in Remarks.

Sync status is visible in admin:

- `PENDING`: queued; not posted yet.
- `PROCESSING`: another request is processing it.
- `FAILED`: failure before the POST; safe to retry.
- `UNCERTAIN`: a POST was attempted without a reliable confirmation, or processing was interrupted. Membership jobs first look for the unique marker with the read-only `getMembershipRows` action. Nothing is blindly resubmitted. Admin must check the destination sheet and explicitly confirm an entry is missing before resending. Enquiry deployments do not expose a read action, so uncertain enquiry writes require manual checking.
- `SAVED`: reception confirmed a write, but local row/ID reconciliation is pending. Retrying performs reconciliation only and never resends a confirmed write. A saved enquiry can complete from its persisted confirmation.
- `SYNCED`: reception confirmed the enquiry, or the approved membership was found with matching amount, phone number, target sheet and admission ID.

App approval remains saved if Sheets is unavailable; admin sees the separate sync status and can retry. For an admission, the temporary `ONLINE-...` ID is replaced with reception's generated `ZF-...` / `HH-...` ID after reconciliation. The local membership's sheet name and row are also updated, so later imports update the same cycle instead of duplicating it. A conflicting record already imported during reconciliation must be resolved by admin; it is not silently overwritten.

## Deployment and verification

Vercel uses the committed `vercel.json` build command, `npm run build:vercel`, to apply pending database migrations before generating Prisma Client and building Next.js. This includes the visitor tables, package prices and renewal/Sheets sync schema. A failed migration stops the deployment instead of publishing pages that query missing tables or columns. Set `DATABASE_URL` in each Vercel environment to the database used by that deployment.

For other hosts, run `npm run db:deploy` against the app database before rebuilding/restarting the app. Production and development output remain separated. A server must have outbound HTTPS access to the supplied Google Apps Script deployments.

Tests cover membership ownership, blocked future dates and client expiry/amount changes, server expiry calculation, atomic approval, preserving existing member accounts, enquiry/admission/renewal payloads, row reconciliation and uncertain-write recovery. `scripts/check-reception.mjs` provides a read-only check of the deployed membership export. It does not add test members or enquiries. Real payment receipt and actual approved/enquiry sheet writes must be checked with genuine submissions.
