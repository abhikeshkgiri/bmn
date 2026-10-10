# BookMyNai Salon Owner-First Workflow Report

## Summary

Salon owners now have a dedicated OTP signup and onboarding path. Barber onboarding is reserved for staff joining an existing approved salon; it no longer creates salons. New owner submissions stay pending and unpublished until admin approval. The existing salon, barber, service, booking, and user models are reused.

## Workflow and implementation

- `/salon/signup` requests an OTP through the salon-owner-specific endpoint. The signup role is chosen server-side and stored with the OTP; the verification request cannot promote a customer by supplying a role.
- `/salon/onboarding` submits a salon profile using the shared supported-city selector. Owners can view application status and rejection feedback.
- Salon creation sets `PENDING`, inactive, and unverified. Admin approval/rejection records status, reviewer, timestamp, reason, and audit history. Owner profile edits return the application to pending review.
- `/barber/onboarding` associates a barber/staff account with an existing supported, approved salon and selected active services. It does not create a salon.
- Public salon, barber, and service discovery, owner activation, staff onboarding, and booking/availability require an active, verified, supported salon with approved status.
- Legacy salon records without `approvalStatus` remain eligible only when verified; explicit `PENDING` and `REJECTED` records are excluded. New owner-created salons always persist an explicit pending status.
- `/barber/signup` and legacy salon routes retain redirects into the owner-first flow or canonical dashboard.

Relevant implementation includes `src/models/OtpVerification.ts`, `src/models/Salon.ts`, `src/services/auth.service.ts`, `src/services/salon.service.ts`, `src/services/onboarding.service.ts`, `src/services/barber.service.ts`, `src/services/service.service.ts`, `src/services/booking.service.ts`, and the corresponding `/salon`, `/barber`, dashboard, and API routes.

## Database and production-data status

| Check | Status | Finding |
|---|---|---|
| Application configuration reviewed | PASS | The application uses `MONGODB_URI`; `.env.local` values were not printed or copied into this report. The existing sanitized database audit identifies the configured target as local MongoDB at `localhost:27017`, database `bookmynai`. |
| Intended database confirmed | BLOCKED | Atlas has not been confirmed as the intended application target. The prior Atlas UI observation of another database does not establish that it should replace the application's local target. |
| Database connectivity | BLOCKED | A prior application connection attempt to local MongoDB was refused on both IPv6 and IPv4 loopback. No Atlas connection was attempted with unconfirmed credentials or configuration. |
| Salon and related collection inspection | BLOCKED | Salon, barber, user, service, and booking record counts/statuses were not queried because the intended database is unconfirmed and local MongoDB was unavailable. |
| Production writes or migration | PASS | No database writes, data corrections, migrations, bulk updates, deletes, or Atlas security changes were made. Existing bookings were not modified. |

The transition adds strict handling for new `PENDING` records while retaining verified legacy records lacking an approval status. The number and state of real records remains unknown until a read-only audit can be run against the confirmed database.

## Verification results

| Check | Status | Result |
|---|---|---|
| TypeScript (`tsc --noEmit`) | PASS | No TypeScript errors after the workflow changes. |
| Targeted ESLint | PASS | No lint errors in the reviewed workflow files. The demo seed file reports pre-existing unused eslint-disable warnings. |
| Launch-city and approval compatibility tests | PASS | All supported city/state checks and explicit-approved, legacy-verified, pending, and rejected approval cases passed. |
| Production build | PASS | The final Webpack production build completed successfully, including TypeScript, static page generation, and build tracing. |
| Phase 24 integration tests using real database records | BLOCKED | Not run because the intended database is not confirmed and the configured local MongoDB was unavailable. |
| End-to-end browser flow with persistent salon data | BLOCKED | Not verified against a connected database. A successful static production build does not prove database-backed signup, approval, or booking behavior. |

## Limitations and recommended manual actions

- The onboarding flow does not yet include image/gallery uploads or a dedicated invitation-token and staff-association approval handshake. Barber onboarding submits a pending barber profile using the existing architecture.
- Before real-data verification, confirm whether local `bookmynai` or a specific Atlas database is the intended target. If Atlas is intended, configure it locally without sharing its URI or credentials in chat; do not change Atlas network-access controls without explicit approval.
- Once the target is confirmed, run read-only counts of supported, unsupported, incomplete, pending, approved, and rejected salon records. Review legacy verified records without approval metadata before any production correction.
- No migration is recommended until those records are inspected. Any data modification requires a reviewed record list, backup/rollback plan, and explicit approval.
