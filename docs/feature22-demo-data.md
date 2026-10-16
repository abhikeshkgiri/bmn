# Feature 22 demo salon data

The Feature 22 fixtures create 20 visibly disclosed, temporary demo salon listings across the cities in `src/constants/launch-cities.ts`. Their salon descriptions state that the business, address, staff, and sample prices are illustrative. Listings have no ratings or reviews. All salon and barber images use the existing local `/salon-placeholder.svg` asset; no distinct salon/barber photographs or external royalty-free sources have been verified, so the generic placeholder is used instead.

The seed uses the existing Mongoose connection and models, with existing salon, service, and barber Zod schemas plus Mongoose model validation. It creates stable `demoKey` markers on demo users, salons, services, and barbers. Demo owner and barber accounts use synthetic contact numbers, are not marked OTP-verified, and do not provision login access or bypass authentication.

The homepage uses the existing supported-city selector and public salon discovery API. It shows loading, error/retry, and unsupported-city states based on that request. Seeded demo salons remain API-backed and carry a preview marker in salon, barber, map, and booking UIs; preview records do not display stored rating summaries. The fixture listing, staff, services, prices, and availability are illustrative.

Server-side booking, rescheduling, home-service booking, payment-order, refund, and review paths reject records carrying a Feature 22 marker. The marker is read from the persisted salon, barber, and service records; clients cannot supply or override it. Public eligibility remains unchanged. These guards are static-code verified, not database-integration verified.

If a historical demo booking already has a captured provider payment, payment verification refuses to treat it as a normal booking. The webhook records the provider capture as reconciliation-required (`DEMO_RECORD_PAYMENT`) without confirming or marking the booking paid. Automatic refunds and booking lifecycle changes for demo-linked records are blocked; any real captured funds for such a historical record require explicit operational reconciliation. Do not seed these fixtures into a database containing real customer history or use real customer/provider accounts to exercise demo bookings.

Run only one seed or cleanup operation at a time. Sequential reruns use the stable markers to update the same demo records; concurrent operations are not locked.

## Seed

First check the non-secret database classification locally. The operation script independently requires a development/test database name and a local or explicitly development/test-named host, rejects production-like configuration, and requires exact confirmation matching the database name parsed from `MONGODB_URI`. A remote host without an explicit development/test marker is rejected even when its database name contains `dev` or `test`.

```powershell
npm.cmd run seed:feature22-demo -- seed --confirm-database bookmynai_dev
```

Use the name from the local development/test database configuration, not a URI or credential. Do not pass a production database name. The script confirms the connected database name before changing records and reports created and updated record counts. It creates salon, service, and barber records but does not create customer bookings, payments, reviews, or notifications. Do not use a real customer account to exercise the booking flow against these records; see the isolation limitation above. Homepage offers are non-redeemable examples, and homepage reviews are anonymous placeholder copy with no real ratings.

The prior `seed:demo` and `seed:demo:reset` scripts are separate legacy scripts; do not use them for this dataset. The legacy reset path has broad deletion filters unrelated to the Feature 22 markers.

## Cleanup

Run cleanup only after stopping/quiescing booking traffic and confirming no booking or other protected relationship references a demo record. The relationship preflight is deliberately conservative but is not a transaction, so do not clean up while demo records are being used:

```powershell
npm.cmd run cleanup:feature22-demo -- --confirm-database bookmynai_dev --confirm-delete-feature22-demo
```

Cleanup targets only the exact Feature 22 `demoKey` values. It checks for bookings, payments, reviews, notifications, favorites, push subscriptions, audit logs, coupons and usage, customer addresses, loyalty or membership records, payouts, support tickets, inventory or leave records, and cross-dataset salon/service/barber relationships. If any are found, it refuses all deletion and reports that records were preserved. Do not remove retained records manually while financial or booking history still references them; follow the project's data-retention policy first.

## Booking test boundaries

The fixtures do not create a verified customer, fabricate a payment, or alter booking/payment status. Server-side booking, payment, refund, and review guards reject Feature 22-marked records, but those guards remain unverified against a database and provider sandbox. Any controlled test of the rejection paths requires an approved disposable database; payment-provider behavior additionally requires an approved sandbox. Do not run these tests against real customer history or live provider credentials. OTP and payment-provider behavior remains unverified by pure fixture checks.
