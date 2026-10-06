# Visitor enquiries and UPI memberships

The login page offers member login and a visitor route at `/explore`. Existing members continue using their registered phone number and temporary password, with the existing first-login password/profile onboarding. Visitors have a separate account and HTTP-only session; visitor access does not grant access to member APIs.

The visitor page includes the supplied gym tour, strength training and functional training videos in `public/gym`. Descriptive VTT tracks accompany the training videos. The trial enquiry contains exactly three inputs: name, contact number and trial date. It works without an account and is persisted for admin follow-up. Dates use Asia/Kolkata. Sending the form requests a visit; it does not confirm a booking.

## Setup and operation

1. Apply migrations with `npx prisma migrate deploy` to each deployment database. The new migration is `20261006120000_visitor_joining`.
2. Open **Admin → Members → Trial enquiries, UPI payments & plan prices** (`/admin/joining`) to manage prices and availability. Migration `20261006130000_membership_package_prices` installs the gym's 12 published packages: Male, Female and Female Happy Hours, each with 1-, 3-, 6- and 12-month options. Female Happy Hours is explicitly restricted to females from 10 AM to 4 PM within gym opening hours. Legacy duration-only plans remain in the database for imported memberships and are inactive for new purchase. Subsequent seeding preserves admin changes to package prices and availability.
3. Visitors create an account and select a priced plan. The server reads the amount from the database and creates a unique order reference. Repeat checkout reuses an open order, including its original price.
4. Checkout sends payments to `zenithfitness360@okicici` using UPI only. App links and the generated QR include the amount, INR, gym name and order reference. There is no card, cash or UPI collect flow.
5. The visitor returns and submits the 12-digit UTR from the UPI receipt. Their order becomes **Submitted**, not paid.
6. Admin checks the gym's bank/UPI statement for matching amount and UTR, then explicitly confirms receipt. One database transaction creates the member, member login, paid membership, reviewed order and reception Sheets sync job. The selected start date is preserved and the end date is system generated; the visitor's chosen password is retained for member login, and the existing birth-date onboarding still applies. Duplicate member phone numbers require manual resolution. See [Renewals and reception sync](renewals-and-reception-sync.md) for date rules, renewal approval and delivery recovery.

## App launch and payment verification

Android Capacitor uses the registered `UpiPayments` native plugin to launch Google Pay, PhonePe, Paytm or the UPI chooser. Rebuild the Android app to include this plugin. Mobile Android browsers use intent links; iOS Google Pay uses its documented `gpay://upi/pay` scheme. Other UPI handlers depend on device support. Desktop and unsupported devices can scan the QR or copy the UPI ID. No PIN or bank account PDF is stored in the app.

Older Android APKs without `UpiPayments` fall back to the generic `upi://pay` link handled by Capacitor's existing external-app bridge. Select Google Pay in the Android chooser; direct app-specific launch requires the updated APK (1.0.13). Launch failures display the native error instead of hiding it. UPI text parameters use percent-encoded spaces because some payment apps display form-encoded `+` literally.

If Google Pay opens with the correct recipient and amount but reports a bank-limit rejection, payment has not succeeded. The app cannot determine or change the bank's limit. Check the failed transaction with Google Pay/the paying bank before retrying, and submit a UTR only for a successful payment of the full order amount.

The supplied UPI ID alone cannot authenticate successful payment. App launch, app return and a user-submitted UTR never activate membership automatically. Automatic confirmation would require a bank/PSP merchant integration with authenticated server-side transaction verification or webhooks. This implementation uses gym review; do not treat a screenshot or app callback as proof of receipt.

Order prices and durations are immutable snapshots. UTRs are unique, pending-order creation is serialized per visitor, and activation is serialized per order and visitor. Admin review identity and time are stored. The admin page shows the latest 100 enquiries and 100 open payments; the visitor sees the latest 20 orders.

## Verification

Run `npm run typecheck`, `npm test` and `npm run build`. Route tests cover server-owned pricing, session/ownership checks, missing prices, repeat checkout, submitted-only approval and duplicate activation. With the app running on port 3010, `node scripts/smoke-visitor.mjs` checks the rendered routes, unauthenticated access controls, invalid enquiry rejection and video range delivery. On an Android device with UPI apps installed, verify all app launch choices, prefilled recipient and amount, cancelled payment, QR fallback, return to app and UTR submission. Verify activation only after admin confirmation. Real payment execution must be checked on a device with the gym's confirmed UPI recipient.

UPI integration reference: [Google Pay Android intents](https://developers.google.com/pay/india/api/android/in-app-payments), [Google Pay iOS app handoff](https://developers.google.com/pay/india/api/ios/in-app-payments), [merchant verification prerequisites](https://developers.google.com/pay/india/api/web/intro).
