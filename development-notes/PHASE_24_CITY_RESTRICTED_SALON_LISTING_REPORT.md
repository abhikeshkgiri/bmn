# Phase 24: City-Restricted Salon Listing Report

## Summary

Salon creation, location changes, activation, approval, public discovery, barber onboarding, and booking validation use the shared 15-city/state allowlist in `src/constants/launch-cities.ts`. Unsupported locations are not silently mapped to Delhi. The home and search experiences no longer substitute demo salons when live data is unavailable.

## Database connectivity and configuration

| Check | Status | Finding |
|---|---|---|
| Application database configuration | PASS | `.env.local` defines `MONGODB_URI`; sanitized target is `localhost:27017`, database `bookmynai`. No URI credentials or secrets are recorded here. |
| Application connection utility | PASS | `src/lib/db.ts` loads `.env.local` for direct Node processes, caches the Mongoose connection, uses a 10-second selection/connect timeout, and logs connection failures before rethrowing. |
| Intended database confirmed | BLOCKED | The configured application database is local MongoDB, not Atlas. Atlas UI inspection previously showed `abhikesh_db` with `activities` and `users`; it has not been established that this is the intended application database, and the app has not been connected to it. |
| Connectivity to configured local database | BLOCKED | An earlier application/test connection attempt failed with `ECONNREFUSED` for both `::1:27017` and `127.0.0.1:27017`. This indicates the local MongoDB service was unavailable at that time; it does not establish an Atlas authentication, network-access, or permission failure. |
| Atlas connectivity, permissions, and application reads | BLOCKED | No application connection was made to Atlas, so authentication, IP access, grants, selected database, and collection reads could not be verified. |

## Schema and city enforcement reviewed

The existing models are used; no duplicate salon collection or schema was introduced:

- Salon: `src/models/Salon.ts` (`address.city`, `address.state`, `isActive`, `isVerified`, and location fields).
- Barber: `src/models/Barber.ts`.
- User: `src/models/User.ts`.
- Service: `src/models/Service.ts`.
- Booking: `src/models/Booking.ts`.

Enforcement paths reviewed or updated:

- `src/services/salon.service.ts` validates and canonicalizes salon creation and location changes; rejects unsupported activation/verification; public salon queries include the supported city/state filter and require active, verified salons.
- `src/services/admin.service.ts` rejects approval for unsupported salon locations.
- `src/services/onboarding.service.ts` validates new barber-created salons and only associates a barber with an existing supported, active, verified salon.
- `src/services/booking.service.ts` rejects new bookings for inactive, unverified, or unsupported salons.
- `src/app/api/salons/nearby/route.ts` applies the allowlist to geospatial discovery.
- `src/app/page.tsx`, `src/app/search/page.tsx`, `src/components/location/NearbySalons.tsx`, and `src/app/salons/page.tsx` use live salon discovery and the shared supported-city configuration. Unsupported or unresolved GPS locations do not fall back to Delhi.

## Existing salon data audit

| Check | Status | Finding |
|---|---|---|
| Read-only salon-record inspection | BLOCKED | The intended database has not been confirmed and the configured local database refused connections. No salon records were queried. |
| Counts of supported, unsupported, or incomplete locations | BLOCKED | Counts cannot be safely verified until the intended database is connected. No record-level data was disclosed or changed. |
| Draft/pending/active/published status counts | BLOCKED | The project schema exposes `isActive` and `isVerified`; no intended-database records were available to classify. |
| Manual review identification | BLOCKED | No candidate records can be identified without a read-only query against the confirmed database. |

## Production data risk and changes

- No production or local database writes, migrations, index changes, bulk updates, address rewrites, deletions, or salon deactivations were made.
- Existing customer booking records were not modified.
- New booking requests now reject salons that are not active, verified, and in a supported city/state pair. If the intended database contains previously active listings outside the launch cities, new booking attempts for those salons will be rejected; the number of potentially affected listings is unknown pending the read-only audit. Existing bookings remain unchanged.
- No migration is currently recommended. Any data correction or production write requires a record-level impact review, backup/rollback plan, and explicit approval.

## Tests and build

| Check | Status | Result |
|---|---|---|
| Launch-city configuration tests (`scripts/test-launch-cities.ts`) | PASS | All 15 supported pairs, case/whitespace normalization, unsupported/mismatched locations, and state filters passed. |
| TypeScript (`npm exec tsc -- --noEmit`) | PASS | No type errors. |
| Targeted ESLint | PASS | No errors; existing `<img>` optimization warnings remain in the home and nearby-salons components. |
| Production build (`npm run build`, Windows Webpack runner) | PASS | Compilation, TypeScript, page-data collection, generation of all 117 static pages, and build tracing completed successfully. |
| DB-backed Phase 24 tests against intended database | BLOCKED | The intended Atlas database is unconfirmed and local MongoDB is unavailable. Tests were not run against an unconfirmed production-like target. |
| Mutation tests against a dedicated test database | BLOCKED | No confirmed dedicated test database is configured; no fixture writes were attempted. |

## Recommended manual action

1. Confirm which Atlas cluster and database are the intended application target. Configure its URI locally in `.env.local` without posting credentials in chat; do not change Atlas network-access settings unless explicitly approved.
2. Start the configured local MongoDB service if `localhost:27017/bookmynai` is intended, or replace the local URI only after confirming Atlas as the target.
3. After the target is confirmed, rerun the read-only location/status counts and application collection-read checks before considering any migration or production-data change.
4. Rotate the MongoDB account password previously exposed during the sign-in flow.
