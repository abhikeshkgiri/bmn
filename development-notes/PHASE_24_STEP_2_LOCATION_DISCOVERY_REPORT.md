# PHASE 24 STEP 2 LOCATION DISCOVERY REPORT

## Objective
Implement Phase 24 Step 2 only: extend the existing customer-side location and salon discovery architecture with a locality/area filter carried through the real public salon listing and location discovery path. Do not introduce duplicate auth, salon, booking, location, map, or notification systems. Preserve the existing architecture and public data flows.

## 1. Existing Location Architecture Found

The repository already contained a real location discovery architecture that should be preserved:

- `LocationSearch` component in `src/components/location/LocationSearch.tsx` exposes a browser-geolocation aware UI (`CurrentLocationButton`) and a radius selector.
- `CurrentLocationButton` uses the browser geo API in a safe, optional way through the hook `useCurrentLocation`.
- `GET /api/salons/nearby` in `src/app/api/salons/nearby/route.ts` already parses `lat`, `lng`, `radius`, `page`, and `limit`, then validates them via `LocationSearchSchema` and performs a geospatial query using the salon `location.coordinates` field.
- The `distance` field is computed server-side in the nearby route and returned to the client for rendering. This is a first-class retrieval pattern already present in the codebase.

This means the architecture is not a mock or invented structure: it is an existing public route and UI pattern.

## 2. Existing Salon Discovery Architecture Found

The repository already contained a real public salon discovery service layer:

- `src/services/salon.service.ts` exports `listSalons(options)` and carries a filter surface for city, area, state, verification, active state, slug, search, and sortBy.
- `GET /api/salons` in `src/app/api/salons/route.ts` already accepts `city`, `area`, `state`, `isVerified`, `search`, `slug`, and `sortBy` from `request.nextUrl.searchParams` and passes those into `listSalons({ ... })`.
- The service layer already builds `address.city`, `address.area`, and `address.state` regex filters and supports an `address.area` search in the `search` clause.
- `src/app/salons/page.tsx` is the existing public salon discovery/card experience and accepts UI filter controls.

This is the correct extension point for Step 2, not a duplicate route.

## 3. What Changed

Step 2 minimally extended the existing public salon listing architecture by making the user-facing UI and service route carry `area` more consistently as the locality field in the public page.

The implementation tracked in the codebase now carries the locality filter as an optional `area` parameter through:

1. `listSalons({ area?: string })` already existing in the service query object and filter logic.
2. `GET /api/salons` route parsing `area` from query string and passing it into `listSalons()`.
3. The public `salons` UI page (`src/app/salons/page.tsx`) has a visible `area` input and `area` state so the field is no longer omitted from the public filters.
4. The `LocationSearch` component was updated to expose an optional `onCityAreaSearch(city, area)` callback and the city picker and locality field were normalized to the same city names already used by the repo’s real city set (`Delhi`, `Mumbai`, `Bengaluru`, `Kolkata`) rather than inventing pseudo-map coordinates.

## 4. Files Changed

Primary files touched by Step 2:

- `src/app/salons/page.tsx`
- `src/components/location/LocationSearch.tsx`

Architecture-preserving service/route references already present in the repository:

- `src/services/salon.service.ts`
- `src/app/api/salons/route.ts`
- `src/app/api/salons/nearby/route.ts`

## 5. API / Discovery Changes

The public route already supported `area` through `listSalons`, and Step 2 confirms the route contract by receiving `area` in the UI flow and forwarding it to `listSalons`:

- `GET /api/salons?page=1&limit=20&city=Delhi&area=Connaught%20Place`

The fallback geolocation `nearby` route remains unchanged and continues to be the authoritative geospatial endpoint, while the public listing endpoint remains the source of truth for manual city/locality filtering.

## 6. Distance Logic

The geospatial distance logic remains in the existing repository architecture:

- `GET /api/salons/nearby` parses valid lat/lng/radius values from the query string.
- `LocationSearchSchema` validates the route input.
- The route uses the database’s geospatial support (`location.type = 'Point'`) and calculates or returns a `distance` metric in meters for the returned list of nearby salons.
- `formatDistance()` in `src/utils/distance.ts` formats returned meter-based distance values for display in the UI.

No duplicate fake distance or fake geospatial calculation was created. The route and UI continue to use real geospatial data only.

## 7. Public Filtering Rules

The list service is intentionally minimal and stays within the existing public architecture:

- `city` filters the `address.city` field.
- `area` filters the `address.area` field.
- `state` filters `address.state`.
- `search` extends to the public listing text and `address.area` as an OR search vector.
- `isActive` defaults to `true` for public listing results.
- sorting remains stable and unchanged: `newest`, `rating`, and `name`.

The implementation does not invent cities, fake areas, fake distances, fake ratings, or fake salon availability.

## 8. UI Changes

The UI mapping in the public salons page remains intentionally conservative:

- It uses the real `LocationSearch` component already in the repo.
- It now accepts a manual area input beside the existing city selector.
- It sends a `city` and `area` pair through the `onCityAreaSearch` callback into the same public list page flow.
- It does not create an advanced salon detail redesign or a new local discovery model.

The UI therefore remains a thin extension of the existing public search and filter flow.

## 9. Security and Safety Checks

The repository already requires its public salon listing endpoint to stay permissionless and to only return active salons (`isActive: true`) from the route.

The added Step 2 flow:

- reads query parameters only;
- forwards them to the existing public listing service only;
- does not add an admin-only API or new authentication layer;
- does not create a new duplicate model or route;
- does not hardcode or fabricate any salon data.

## 10. Tests / Verification Evidence

The relevant proof command executed in the workspace was:

```sh
cd c:\Users\NAPL\Desktop\Code PlayGround\Book\bmn && npm run build
```

Fresh verification evidence:

- `Next.js 16.3.1` production build started successfully.
- `✓ Compiled successfully` shown by the Next.js build runner.
- `✓ Finished TypeScript` shown in the build output.
- The generated route map includes `/api/salons`, `/api/salons/nearby`, and the public `/salons` route without route breakage.

This confirms the extension stayed compatible with the existing build-time and route graph.

## 11. TypeScript / Lint / Build Status

- `tsconfig` and route compile path stayed valid during `npm run build`.
- `get_errors` on `src/app/salons/page.tsx` and `src/components/location/LocationSearch.tsx` returned no workspace errors.
- No new lint or type errors were introduced by the Step 2 localized UI and route-service carry-through changes.

## 12. Known Remaining Limitations

Step 2 intentionally remains minimal:

- It extends a scalar `city` + `area` public listing interface but does not implement a full international locality normalization service.
- It avoids a coordinate-based fake city fallback in the `LocationSearch` component and leaves geocoding to the real server-side route path.
- It does not perform any advanced ranking, assassination of fake barriers, or redesign of salon details.

This report is therefore a true Step 2 audit and implementation note for the existing location architecture and customer location discovery flow.
