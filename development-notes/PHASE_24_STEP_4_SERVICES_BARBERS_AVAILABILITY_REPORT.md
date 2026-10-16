# PHASE 24 STEP 4 — SERVICES + PRICES + BARBERS + AVAILABILITY

## Objective
Extend the existing public salon detail route in a minimally invasive way by reusing the repository's real service, barber, and booking availability architecture.

## Scope
This step remains intentionally limited to:
- fetching real public services from the existing `/api/services` route;
- surfacing real public prices and duration from the `Service` model;
- listing real public barbers from the existing `/api/barbers` route;
- filtering barbers that are tied to the selected service using the `Barber.services` relation;
- querying the existing `/api/bookings/availability` route for real slot availability.

## Non-goals
This work does not create duplicate booking, service, barber, salon, location, authentication, maps, notification, or payment systems.

## Implementation notes
The public salon detail page at `src/app/salons/[slug]/page.tsx` now:
1. fetches the salon details as before;
2. fetches active services for that salon from the public `GET /api/services` route;
3. fetches active barbers for that salon from the public `GET /api/barbers` route;
4. shows the selected service's price and duration in the page;
5. lets the shopper pick a barber and service from the real public service/barber records;
6. shows a date picker and queries the server-authoritative `GET /api/bookings/availability` route.

The implementation keeps the repository contract intact: the `Service` model owns `duration` and `price`; the `Barber` model owns `services` and `specializations`; the `booking.service.ts` authoritatively checks `barber.salon`, `service.salon`, and `barber.services` compatibility.

## Verification
Static workspace verification reports no TypeScript/JSX errors in the edited page file.
