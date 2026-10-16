# PHASE 24 STEP 7 — BARBER ONBOARDING, PROFILE, SALON ASSOCIATION, AVAILABILITY

## 1. Existing barber architecture
The repository already contains a working barber architecture separate from salon ownership:

- `src/constants/roles.ts` defines the split roles `CUSTOMER`, `BARBER`, `SALON_OWNER`, `SALON_STAFF`, `ADMIN`, and `SUPER_ADMIN`.
- `src/models/User.ts` stores the authoritative server-side account role in the user record and does not allow the client to rename the role safely.
- `src/models/Barber.ts` stores the underlying barber identity and profile fields such as `user`, `salon`, `name`, `slug`, `profileImage`, `bio`, `experienceYears`, `specializations`, `services`, `portfolio`, `rating`, `reviewCount`, `isAvailable`, `bookingLockVersion`, `offersHomeService`, `homeServiceRadius`, `isVerified`, and `isActive`.
- `src/services/barber.service.ts` enforces ownership checks and keeps barber CRUD inside the existing service layer.
- `src/services/onboarding.service.ts` already provides full `BarberOnboardingSchema`, `completeBarberOnboarding(...)`, and `getBarberOnboardingStatus(...)` flow for barber onboarding.
- `src/app/api/barber/onboarding/route.ts` is the existing route that authenticates the user and runs the onboarding service.
- `src/app/api/dashboard/barber/profile/route.ts`, `src/app/api/dashboard/barber/stats/route.ts`, and `src/app/api/dashboard/barber/bookings/route.ts` already expose the role-separate barber dashboard endpoints.
- `src/app/dashboard/barber/page.tsx` and `src/app/dashboard/barber/profile/page.tsx` already consume the real route/service shape.

The critical design fact is that the `Barber` record is linked to a `Salon` through `barber.salon`, but that relationship does not grant the barber the `SALON_OWNER` role or the ability to update salon business ownership.

## 2. Authentication
The repository’s authentication remains the canonical architecture:

- `getCurrentUser()` from `src/lib/auth` is used by the barber onboarding and dashboard route endpoints.
- `src/app/api/barber/onboarding/route.ts` verifies the caller is logged in and allows only `CUSTOMER` and `BARBER` through the onboarding gate in the GET/POST handler.
- `src/services/onboarding.service.ts` explicitly checks `actor.role !== CUSTOMER && actor.role !== BARBER` as the server-side allowed flow and rejects role tampering.
- `src/models/User.ts` holds a role enum and the DB remains source of truth.

This means the barber workflow reuses the existing user/session layer; the user role is determined by the server and not by the client.

## 3. Barber profile
The existing backend and UI already support the real barber profile structure through the `Barber` model:

- `name`, `profileImage`, `bio`, `specializations`, `services`, `portfolio`, `offersHomeService`, `homeServiceRadius`, `experienceYears`, and the `isAvailable`/`isActive` profile status all exist in `Barber` model and schema validation.
- `src/validations/barber.schema.ts` carries the update/create shapes for the profile.
- `src/services/barber.service.ts` validates service arrays that belong to the chosen salon and uses the existing relationship to update a barber record.
- The profile route is `GET /api/dashboard/barber/profile` and `PATCH /api/dashboard/barber/profile`.

The UI in `src/app/dashboard/barber/profile/page.tsx` fetches and edits the real barber-owned data using the existing dashboard API.

## 4. Salon association
The existing architecture supports a barber being associated to a salon through the `Barber.salon` field. The server validates the same:

- `createBarber()` requires the current user to be `SALON_OWNER`, `ADMIN`, or `SUPER_ADMIN` and ensures the service IDs belong to the target salon.
- `getBarberById()` and `getBarberBySlug()` support service and role-aware authorization rules.
- `BarberOnboardingSchema` and `completeBarberOnboarding()` permit `salonMode = 'existing'` by accepting an `existingSalonId` server-side and active/verified salon expectation, or create a salon when `salonMode = 'new'`.
- `completeBarberOnboarding()` only creates a `Barber` document after the salon has been resolved or created and after the selected services are validated as belonging to that salon.

The repository does not allow a barber to read `salonId` from the client and attach itself arbitrarily. The association is validated server-side, and in `completeBarberOnboarding()` the salon is retrieved by object id and checked for active/verified state.

## 5. Barber vs salon-owner permissions
The repository already keeps `BARBER` separate from `SALON_OWNER`:

- `Barber` records reference a salon, but that reference does not carry the salon owner privileges.
- `createBarber()` only allows salon owner/admin/super-admin to create or assign barbers. It never allows a `BARBER` role to create another barber, or to grant themselves ownership.
- `updateBarber()` in `src/services/barber.service.ts` checks that a `BARBER` user can only update their own `Barber` profile, and a `SALON_OWNER` can only update a barber whose `salon.owner` matches them. Admin/Super Admin can bypass.
- `src/services/barber.service.ts` consistently denies edits to unrelated or unauthorized salons and barbers.

This satisfies the Step 7 requirement that a barber must not become a salon owner because of a salon reference.

## 6. Service association
The service relationship is already connected through the `Barber.services` array and the `Service.salon` reference:

- `createBarber()` validates all requested services against the supplied `salonId` and ensures the selected service IDs belong to that salon.
- `completeBarberOnboarding()` validates service IDs against `Service.find({ _id: { $in: input.barber.serviceIds }, salon: selectedSalon._id, isActive: true })`.
- `getAvailableSlots()` and `createBooking()` in `src/services/booking.service.ts` both validate the barber and service relationship as part of the canonical booking security chain.

The public booking path therefore remains service and barber-authoritative; a barber is not allowed to expose a service outside the salon’s service collection.

## 7. Availability
The canonical customer-facing availability source is already the bookings service and the route:

- `src/app/api/bookings/availability/route.ts` exposes `GET /api/bookings/availability`.
- `src/services/booking.service.ts` implements the real `getAvailableSlots()` service that validates salon, barber, and service and returns a slots array.
- The `Barber` model has `isAvailable`, `offersHomeService`, and `homeServiceRadius` fields but the authoritative booking availability remains generated from the service and real booking schedule instead of a separate system.

The repository therefore reuses the existing availability engine and keeps the route authoritative for customer availability.

## 8. Booking access
The existing booking service restricts booking visibility to the booking owner/role/barber relationship:

- `getSalonDashboardStats()` and `getSalonBookings()` in the service permit salon dashboards to query only the appropriate salon scope, with admin override rules.
- `getBarberDashboardStats()` and `getBarberBookings()` in `src/services/booking.service.ts` only populate the booking documents that belong to the right `barber` or `salon` and user identity boundary.
- Booking authorization rejects a barber if they do not correspond to the correct `barber._id` or `salon.owner` context.

The route permission model remains consistent with the project’s existing server-side trust model and does not permit cross-barber or cross-salon access through client input.

## 9. Dashboard
The repository already carries the real barber dashboard surfaces:

- `src/app/dashboard/barber/page.tsx` is the dashboard page showing authorized barber profile and booking stats using `/api/dashboard/barber/stats`.
- `src/app/dashboard/barber/bookings/page.tsx` provides a list of bookings for the barber.
- `src/app/dashboard/barber/profile/page.tsx` allows updating the barber profile through `/api/dashboard/barber/profile`.
- `src/app/dashboard/barber/home-service/page.tsx` supports the home-service assignment UI and existing barber route.

These are route-backed and consistent with the role separation. The UI remains route-based, not a separate new architecture.

## 10. Customer integration
The customer-facing booking funnel remains the existing one:

- public salon list and detail route remain canonical;
- `book/[salonSlug]` route enables service -> barber -> date -> slot selection;
- server `GET /api/bookings/availability` remains the authoritative final slot provider.
- `BookingCreateSchema` and `createBooking()` remain the server-authoritative API path.

A barber’s own availability and service mapping affect eligible slots through the same `barber.services`, `barber.salon`, and service validation chain. No separate customer-facing barber API was introduced.

## 11. Salon changes/leaving behavior
The existing service model is conservative and avoids corrupting history:

- Barber records point to a `salon` object reference; the historical `Booking` record continues to point to historical `salon`, `barber`, and `service` references.
- Leaving a salon changes future association through enforcement in the service or update route.
- There is no destructive deletion of historical bookings in the service or route layer.

This preserves the booking trace without allowing a barber to silently access or rewrite old salon records.

## 12. Security / IDOR checks
The repository already has the intended checks:

1. Customer cannot access barber-management routes because role-gated dashboard routes reject the wrong role.
2. Barber can access their own profile through `GET /api/dashboard/barber/profile` and `PATCH /api/dashboard/barber/profile`.
3. Barber cannot edit another barber because service update checks `barber.user === currentUser._id` or the `BARBER` role context is validated against the matched barber profile.
4. Barber cannot edit another salon because `updateBarber()` and `updateSalon()` require match on owner or admin role.
5. Barber cannot claim arbitrary salon IDs because `BarberOnboardingSchema` validates the server-side `existingSalonId` object and `completeBarberOnboarding()` checks the salon is active and verified.
6. Barber cannot grant themselves salon-owner permissions because role is `BARBER` and must remain in `User.role` state as provided by the server session.
7. Barber cannot access unrelated bookings because `getBarberBookings()` restricts query scope to the matched record `barber._id` and the `currentUser` mapping.
8. Barber cannot modify another barber’s availability because availability is generated from the existing service and booking route and not stored by a client-defined object.
9. Barber cannot modify service ownership because service validation requires `Service` belongs to the same `salonId` in the current route or service layer.
10. Barber cannot manipulate booking price because `BookingCreateSchema` in the route/API is validated and `createBooking()` calculates server-side price.

These checks are the existing repo pattern and are consistent with Step 7 protection of the barber workflow.

## 13. Home-service compatibility
The repository preserves the existing home-service workflow:

- `Barber.offersHomeService` and `homeServiceRadius` are already present in the `Barber` model and service route layer.
- `home-service` APIs and booking paths use the service layer in the same `Booking` and `Barber` model context rather than introducing a separate model.
- `getAvailableSlots()` and available barbers remain bound to the same authorization and relationship rules.

This is consistent with the requested home-service compatibility requirement and does not redesign or split the workflow.

## 14. Public data exposure
The public barber profile surfaces only the intentionally public fields already present in the models and APIs:

- name
- bio
- `profileImage`
- `services`
- `specializations`
- `offersHomeService`
- `homeServiceRadius`
- `rating` and `reviewCount` remain fields on the model but are not new invented categories.

The repository does not expose private authentication, tokens, internal IDs, or hidden booking metadata in the public route. This preserves the public profile posture.

## 15. Tests executed
Focused Step 7 contract check inserted in the test harness:

- `scripts/test-phase24.ts` now carries an explicit Step 7 barber architecture smoke contract that asserts the repository still exposes a real barber attached to a valid salon and that the service/service relationship and `getAvailableSlots()` remain compatible.

Repository verification command actually run:

- `npm run test:phase24`

Evidence observed on the command:

- The script executed until the DB dependency was reached.
- The environment returned `ECONNREFUSED` for the expected MongoDB endpoint (localhost:27017) and therefore the Step 7 test contract cannot be proven green by a live database run.

The runner was corrected in the test file to stop relying on a swallowed `Promise.allSettled(...)` final green message. The test file now wraps the checks in an `async IIFE` with an explicit `catch` and `process.exitCode = 1` instead of reporting a fake green.

## 16. MongoDB/runtime limitations
The environment behavior is clear:

- `npm run test:phase24` in the workspace was run with the normal local test harness.
- It is a repository environment dependency issue: no MongoDB service is present or reachable at the configured host.

This is a runtime environment issue, not a code-level route or service regression.

## 17. TypeScript / lint / build results
Fresh workspace evidence:

- `get_errors` on `scripts/test-phase24.ts` returned `No errors found`.
- Running `npm run test:phase24` from the workspace shows the environment-level dependency issue rather than a TypeScript file-level issue.

No production code was added for Step 7. The existing route and service structure remains consistent with the requested architecture.

## 18. Remaining limitations
The repository already exposes the correct server-side route and service roles for the barber workflow, but the environment has no reachable MongoDB instance. Therefore:

- Step 7’s full end-to-end contract cannot prove a real green test state.
- No extra, separate customer-facing barber or salon API should be introduced.
- No separate booking or availability engine should be created.

## 19. Explicit final status
The repository’s actual Step 7 compatibility posture is already represented by the real `User`, `Barber`, `Salon`, `Service`, `Booking`, and `Availability` route/service contract. The code path remains server-authoritative and route-gated:

- `BARBER` is a distinct role from `SALON_OWNER`.
- `Barber.salon` is a validated intended reference, not an owner privilege.
- `getAvailableSlots()` remains the customer-facing availability authority.
- The dashboard and profile APIs work through the existing route patterns.

Therefore, the report’s explicit final status is:

`PHASE 24 STEP 7: BLOCKED BY ENVIRONMENT`

because the codebase already has the correct architecture, but local MongoDB-backed proof cannot be shown without the database runtime being available.
