# Feature 22 demo salon data

The Feature 22 fixtures create 20 visibly disclosed, temporary demo salon listings across the cities in `src/constants/launch-cities.ts`. Their salon descriptions state that the business, address, staff, and sample prices are illustrative. Listings have no ratings or reviews. All salon and barber photos use the existing local `/salon-placeholder.svg` asset.

The seed uses the existing Mongoose connection and models, with existing salon, service, and barber Zod schemas plus Mongoose model validation. It creates stable `demoKey` markers on demo users, salons, services, and barbers. Demo owner and barber accounts use synthetic contact numbers, are not marked OTP-verified, and do not provision login access or bypass authentication.

The homepage uses the existing supported-city selector and public salon discovery API; it does not contain fixture records or substitute demo salons when discovery fails. It shows loading, empty, error/retry, and unsupported-city states based on that request.

Run only one seed or cleanup operation at a time. Sequential reruns use the stable markers to update the same demo records; concurrent operations are not locked.

## Seed

First check the non-secret database classification locally. The operation script independently requires a development/test database name and a local or explicitly development/test-named host, rejects production-like configuration, and requires exact confirmation matching the database name parsed from `MONGODB_URI`. A remote host without an explicit development/test marker is rejected even when its database name contains `dev` or `test`.

```powershell
npm.cmd run seed:feature22-demo -- seed --confirm-database bookmynai_dev
```

Use the name from the local development/test database configuration, not a URI or credential. Do not pass a production database name. The script confirms the connected database name before changing records and reports created and updated record counts. It does not create bookings, payments, reviews, or notifications.

The prior `seed:demo` and `seed:demo:reset` scripts are separate legacy scripts; do not use them for this dataset. The legacy reset path has broad deletion filters unrelated to the Feature 22 markers.

## Cleanup

Run cleanup only after stopping/quiescing booking traffic and confirming no booking or other protected relationship references a demo record. The relationship preflight is deliberately conservative but is not a transaction, so do not clean up while demo records are being used:

```powershell
npm.cmd run seed:feature22-demo -- cleanup --confirm-database bookmynai_dev --confirm-delete-feature22-demo
```

Cleanup targets only the exact Feature 22 `demoKey` values. It checks for bookings, payments, reviews, notifications, favorites, push subscriptions, audit logs, coupons and usage, customer addresses, loyalty or membership records, payouts, support tickets, inventory or leave records, and cross-dataset salon/service/barber relationships. If any are found, it refuses all deletion and reports that records were preserved. Do not remove retained records manually while financial or booking history still references them; follow the project's data-retention policy first.

## Booking test boundaries

Use an existing authenticated customer account for booking tests. The fixtures do not create a verified customer, fabricate a payment, or alter booking/payment status. OTP delivery and any payment-provider tests remain subject to their existing real authentication and sandbox requirements.
