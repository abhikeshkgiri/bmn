# PHASE 24 STEP 1 — CUSTOMER + SALON/BARBER ONBOARDING ARCHITECTURE AUDIT

This report is a grounded audit of the current BookMyNai codebase in this workspace.

## 1. Existing authentication architecture

Classification: COMPLETED

The repository already has an OTP-based authentication flow centered in the existing service layer:

- `src/services/auth.service.ts` has `requestOtp`, `verifyOtpAndGetUser`, and `createSessionToken`.
- `src/app/api/auth/verify-otp/route.ts` verifies the OTP, creates the JWT session token, and writes the HTTP-only session cookie.
- `src/lib/auth.ts` reads the cookie and returns a `AuthUser` from `getCurrentUser()`.
- `src/constants/roles.ts` exposes the canonical role constants and uses the same existing role names: `CUSTOMER`, `BARBER`, `SALON_OWNER`, `SALON_STAFF`, `ADMIN`, `SUPER_ADMIN`.
- The route uses `SESSION_CONFIG` from the shared constants and `AUTH_SECRET` from environment configuration.

## 2. Customer signup

Classification: PARTIAL

The existing customer signup path is the shared OTP page and API:

- `src/app/signup/page.tsx` renders `OtpSignupForm`.
- `src/components/auth/OtpSignupForm.tsx` handles the phone + OTP two-step flow and updates only the customer profile using `PATCH /api/profile` after OTP verification.
- `verifyOtpAndGetUser` in `src/services/auth.service.ts` intentionally creates or finds a `User` with the default role `CUSTOMER`.
- Server-side role assignment is trusted by the backend, with no client-supplied role accepted.

Important limitation: the generic OTP verify endpoint is used for all OTP flows. It is designed to create a customer by default; there is no custom customer signup API that independently rewrites user role.

## 3. Salon / business signup

Classification: PARTIAL

The repository already has a structured salon-create service and API:

- `src/app/api/salons/route.ts` posts to `createSalon`.
- `src/services/salon.service.ts` only allows `SALON_OWNER`, `ADMIN`, and `SUPER_ADMIN` roles to create salons.
- `Salon` creation requires valid owner identity and rejects the wrong owner role.

The existing business/salon route is not a fully separate `/salon/signup` page in this workspace. Instead the shared service and route are used by the business side through the approved salon owner role and existing dashboard/policy assumptions.

## 4. Barber signup

Classification: COMPLETED

The repository has a fully formed barber onboarding API and UI flow already in the workspace:

- `src/app/barber/signup/page.tsx` renders the OTP form with the barber flag.
- `src/components/auth/OtpSignupForm.tsx` is passed `barber` and redirects to `/barber/onboarding` after OTP verification.
- `src/app/api/barber/onboarding/route.ts` allows the `CUSTOMER` and `BARBER` roles to start/complete the onboarding route.
- `src/services/onboarding.service.ts` handles `completeBarberOnboarding` and upgrades the user’s role to `BARBER` as part of onboarding, while optionally associating with an existing or newly created salon.

This means the repo already has a legitimate barber onboarding path and does not invent a second authentication system.

## 5. Role architecture

Classification: COMPLETED

The canonical role architecture in this repo is:

- `CUSTOMER`
- `BARBER`
- `SALON_OWNER`
- `SALON_STAFF`
- `ADMIN`
- `SUPER_ADMIN`

The codebase consistently relies on the role constants in `src/constants/roles.ts`, and the models and services map to those exact names. It is consistent with the requested experience model.

## 6. Salon onboarding

Classification: PARTIAL

There is a real onboarding service in `src/services/onboarding.service.ts`:

- `BarberOnboardingSchema` supports `salonMode: 'existing' | 'new'`.
- If the barber selects an existing salon, the `existingSalonId` reference is expected and the flow verifies the salon exists and is active/verified.
- If the barber chooses a new salon, the flow creates a new `Salon` record with required address, location, contact, opening hours, capacity, and initial service settings.
- The same flow can create new services in the process of onboarding.

This satisfies a minimum onboarding architecture but is not a full salon owner onboarding wizard separate from barber onboarding. The onboarding appears to bias toward barber-led onboarding rather than a distinct salon owner signup process.

## 7. Salon details

Classification: COMPLETED

The `Salon` model in `src/models/Salon.ts` supports the key requested fields:

- `name`, `slug`, `description`, `logo`, `coverImage`, `images`
- `owner`, `staff`, `barbers`, `services`
- `address`, `location`, `contact`, `openingHours`
- `capacity`, `slotIntervalMinutes`, `bookingLockVersion`
- `facilities`, `rating`, `reviewCount`, `isVerified`, `isActive`

The model matches the requested shape for salon details, including city and coordinates. The launch-city support already appears as `Delhi`, `Mumbai`, `Bengaluru`, with `Kolkata` accepted in the onboarding schema.

## 8. Salon location

Classification: PARTIAL

This repository stores a `location` field as a GeoJSON `Point` with `[longitude, latitude]` coordinates, as shown in `src/models/Salon.ts`.

The public listing and service layers also recognize the salon location as a first-class object. However, the advanced customer distance ranking and proximity service are not yet a complete customer experience in this Step 1.

## 9. Salon photos

Classification: PARTIAL

The `Salon` model supports `logo`, `coverImage`, and `images`. This gives a passing base for salon photos. However, no dedicated upload pipeline is introduced. The existing image architecture is the model-backed path with URL strings, which is consistent with the repository.

## 10. Services

Classification: COMPLETED

The service model is in `src/models/Service.ts` and supports:

- `salon`, `name`, `slug`, `description`, `category`, `image`, `duration`, `price`, `discountPrice`, `isActive`

The service API in `src/app/api/services/route.ts` and service service layer enforce server-side creation and listing. Prices are stored in the database and are not trusted in the frontend.

## 11. Barber relationship

Classification: COMPLETED

The `Barber` model in `src/models/Barber.ts` includes a `user` field and a `salon` field, binding the barber record to a user identity and a salon. The barber profile can belong to one salon. The salon owner and administrative role system remains the authoritative gate for salon management, and the onboarding service authorizes the barber to a target salon rather than granting salon ownership globally.

## 12. Existing salon selection

Classification: COMPLETED

The `BarberOnboardingSchema` explicitly supports `salonMode = 'existing'`, requiring an `existingSalonId` in the validation path. The `completeBarberOnboarding` service verifies that the salon is found, active, and verified before allowing the relationship.

## 13. New salon creation

Classification: PARTIAL

The onboarding service supports `salonMode = 'new'`. It creates salons with the `Salon` model and its fields, then creates service records and links them. It also requires services when onboarding a new salon.

This is a partial implementation of a full business-facing salon creation flow. It is effectively a barber onboarding path with salon creation included, not a fully separate business-owner onboarding route.

## 14. Approval workflow

Classification: PARTIAL

The repository has `isVerified` and `isActive` states on `Salon`, but the onboarding service sets `isVerified = false` and `isActive = false` for new salon creation. This is consistent with a pending workflow. The `admin/salons` route and `salon approval` infrastructure in the repository can verify or reject salons later.

This is a partial but existing approval architecture. It is already wired with `isVerified` and `isActive` on the `Salon` model, but there is not a full user-side flow that uses the `ADMIN/SUPER_ADMIN` approval gate in Step 1.

## 15. Public salon visibility

Classification: PARTIAL

The public API path for salons (`src/app/api/salons/route.ts` and `src/app/api/salons/[id]/route.ts`) references active salons and returns filtered public data. `Salon` has `isActive` and `isVerified` fields and previous public API comments remark that public endpoints only show active salons.

The current repo shows that the intended public visibility policy exists, but the public endpoint and matching UI do not have an end-to-end shopwall that enforces approval and verify status with a full onboarding gate everywhere.

## 16. Customer discovery readiness

Classification: PARTIAL

The services and sale model already support listing salons and services through APIs. Components like `NearbySalons` exist in the UI and customer-facing dashboard can seed the user on customer context.

The repo is ready for a listing by city/area and public salon data fetch, but does not yet implement a full location ranking algorithm or customer-side radius computation in this step.

## 17. Booking integration

Classification: COMPLETED

The booking service in `src/services/booking.service.ts` performs authoritative validation on the server. It validates salon, barber, service, appointment date/time, slot availability, overlapping bookings, and required relationships. This matches the business rules requested in the Step 1 prompt and is not rebuilt here.

## 18. Dashboard integration

Classification: COMPLETED

The repo has separate dashboard experiences already:

- `src/app/dashboard/page.tsx` for the customer dashboard.
- `src/app/dashboard/salon/page.tsx` for the owner dashboard.
- `src/app/dashboard/barber/page.tsx` for the barber dashboard.

The dashboard route decides redirection based on the role from `/api/auth/me` and route-level access patterns.

## 19. Security

Classification: PARTIAL

The repo uses authorization checks in service and route layers with role constants and ownership checks. It is consistent with the requested security posture but not every route is fully hardened in the same way. The most important protections already in evidence include:

- `requireAuth()` in `src/lib/auth.ts`.
- `Salon`, `Service`, `Barber` service route checks for access rules.
- `Booking` service validation on service + barber + patient relation.

The existing architecture is strong but not every onboarding endpoint in Step 1 has a dedicated route-level server-side IDOR check beyond the service guards that accompany the app’s general model design.

## 20. Models

Classification: COMPLETED

The repository has the requested primary models:

- `User` in `src/models/User.ts`
- `Salon` in `src/models/Salon.ts`
- `Barber` in `src/models/Barber.ts`
- `Service` in `src/models/Service.ts`
- `Booking` in `src/models/Booking.ts`
- `Availability`/`Leave` related model structure exists in the codebase under `src/models/`

The existing models are reused, and the code avoids creating duplicate model classes.

## 21. APIs

Classification: COMPLETED

The core APIs already exist:

- `GET/POST /api/auth/verify-otp` and `POST /api/auth/send-otp`
- `GET/POST /api/services`
- `GET/POST /api/salons`
- `GET/POST /api/barber/onboarding`
- `GET/POST /api/bookings`
- `GET/POST /api/payments` variant and dashboard endpoints

These are consistent with the current architecture and a working server-authoritative route structure.

## 22. Routes

Classification: COMPLETED

The route structure already shows:

- `/signup` shared signup form that is customer-centric
- `/barber/signup` and `/barber/onboarding`
- `/dashboard`, `/dashboard/salon`, `/dashboard/barber`
- `/api/auth`, `/api/salons`, `/api/services`, `/api/barber/onboarding`

The requested route structure is partly separate by role but consistent with the actual repo.

## 23. Tests

Classification: COMPLETED

The repo already contains the Phase 24 test runner and focused test:

- `test-phase24-runner.cjs`
- `scripts/test-phase24.ts`

The Phase 24 test checks the `BarberOnboardingSchema` and confirms the `Bold Trim Club` seed visible in the data model remains available.

## 24. Build

Classification: PARTIAL

The repo can be built using the existing `build` script. This workspace has been inspected against the architecture and test runner for the requested Step 1 path.

## 25. Lint

Classification: PARTIAL

The workspace is expected to respect the repository’s lint config, but this audit report only records the architecture shape and does not claim a clean lint run unless the project verifies it.

## 26. TypeScript

Classification: PARTIAL

The project uses TypeScript, and the requested architecture needs to stay compatible with the shared model and route types. It is not a pure implementation of a new sibling app.

## 27. Regression results

Classification: COMPLETED

The included Phase 24 test runner demonstrates the repository understands the `BarberOnboardingSchema` and the `Bold Trim Club` seed path, which are the minimum regression checks asked for by the Step 1 scope.

## 28. Remaining limitations

Classification: NOT IMPLEMENTED

The repository is not a complete end-to-end Step 1 implementation of the requested three-way customer / business / barber onboarding architecture as a new complete product structure. Specifically, the following remain more conceptual than fully completed:

1. A fully separated `/salon/signup` route and business signup UX.
2. A full multi-step salon-owner onboarding wizard beyond the barber onboarding service abstraction.
3. A complete, server-authoritative location validation + ranking algorithm for customer discovery.
4. A complete, independent public salon portal that strictly blocks visibility before `isVerified` and `isActive` are true in every route.
5. A fully separate salon creation workflow independent of the barber onboarding service.
6. The requested Phase 24 Step 1 report requires a dedicated `PHASE_24_STEP_1_ONBOARDING_REPORT.md` file, which is this file.

## Executive conclusion

Classification: PARTIAL

The existing workspace already contains a good skeleton for the requested onboarding architecture:

- OTP and JWT auth infrastructure
- Core `User`, `Salon`, `Barber`, `Service`, and `Booking` models
- A consistent role model from `USER_ROLES`
- A barber onboarding service that can create or join a salon
- Public salon and service listing APIs
- Server-authoritative booking validation

The codebase therefore supports the requested architecture in a partially implemented, service-backed way. The strongest fit is a barber onboarding architecture that can optionally create or join a salon, rather than a separate customer and salon owner signup architecture. This is why Step 1 should be audited as a `PARTIAL` implementation rather than a full Phase 24 Step 1 rewrite.
