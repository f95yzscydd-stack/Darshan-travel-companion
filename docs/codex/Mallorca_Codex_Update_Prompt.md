# Codex Task: Append Mallorca to the Existing Travel Companion App

Do not rebuild the app and do not overwrite Lisbon or Porto. Inspect the existing repository, current TypeScript interfaces, SQLite schema/migrations, seed-data loader, Google Places/Routes services, offline cache, itinerary editing/reordering, coffee layer, alternatives/pivot mode, and cost tracking before making changes.

## Goal
Append Mallorca (Spain) as the next leg of the existing Sept-Oct 2026 trip. Use the attached `mallorca.seed.json` as the source of truth for trip data, while preserving the existing Lisbon + Porto records.

## Required safe schema migration
The current app was initially Portugal-only. Make these additive/backward-compatible changes:

1. Support multi-country trips:
   - Keep legacy `country?: string` if it already exists.
   - Add `countries?: string[]`.
   - Set this trip to `["Portugal", "Spain"]`.

2. Support multiple stays within one city/region plan:
   - Add `stays: Stay[]` to `CityPlan` (or the closest existing type).
   - Add `stayId?: string` to `ItineraryDay`.
   - Do not delete a legacy single `accommodation` field until existing Lisbon/Porto data has been migrated safely.

3. Add structured transport bookings if not already present:
   - `flight` and `rental_car` records.
   - Never store booking codes, email addresses, payment-card details, or other private identifiers in seed data.

4. Add/retain live routing fields:
   - planned duration for offline use
   - live Google Routes duration when online
   - `lastUpdated` timestamp
   - route status: `planned | live | stale`

## Mallorca fixed bookings
- easyJet EJU7384: OPO 08:35 -> PMI 11:20 on Fri Sep 25, 2026.
- Hertz PMI rental: Sep 25 12:00 -> Sep 30 23:00. Vehicle class: Midsize 4 Door, Skoda Karoq or similar. Price: EUR 231.30.
- Port de Pollenca Airbnb: Poligon, Passeig d'Anglada Camarasa, 73 3a planta, Port de Pollenca, Illes Balears 07470, Spain. Sep 25-27.
- Hotel Salino Port Soller - Adults Only: Cami del Far, 15, 07100 Port de Soller, Illes Balears, Spain. Sep 27-29.
- Pure Salt Garonda - Adults Only: Carrer de la Mar Negra, 2, 07610 Palma, Illes Balears, Spain. Sep 29-Oct 2.
- Vueling VY3436: PMI 07:05 -> LIS 08:15 on Fri Oct 2, 2026.

## Important operational rules
- Formentor: show a high-priority access alert. 2026 DGT restrictions run May 15-Oct 18 from 10:00-22:00. Primary plan is TIB line 334 from Port de Pollenca. Add official TIB/DGT links and live timetable refresh.
- Sa Calobra: primary plan is Barcos Azules boat from Port de Soller; road route is a weather backup. Boat times/prices must remain live-checkable.
- Pure Salt Garonda: current listings show no on-site parking. Add a task/reminder to confirm overnight parking for Sep 29 while the Hertz car is still held.
- Hertz: add a pre-pickup checklist field because the screenshot did not show transmission, CDW/theft excess, fuel policy, deposit or mileage.

## Mallorca UX requirements
Preserve the Apple Maps / Google Trips aesthetic already used. Mallorca needs:
- region overview with three stay cards
- day timeline cards
- offline planned route times plus live Google Routes override
- coffee-nearby drawer with Google Places photo, rating, review count, open-now and last-updated timestamp
- parking/access warnings for beaches and mountain roads
- `Primary plan` + `Weather/Crowd backup` presentation
- reservation badges
- `Add to Day`, `Replace Stop`, `Save as Backup`, `Directions` actions
- cost tracking in EUR, with existing CAD conversion display if already implemented

## Traveler preferences to preserve
- Prefer minimal pork, but not strict.
- Seafood welcome; chicken preferred when practical.
- One full dinner per day plus optional drinks/snacks.
- Coffee usually morning + afternoon, preferably not close to dinner.
- Pastry preference: traditional local pastries, croissants and laminated pastries.
- Coffee detour: 5-10 min preferred, outstanding route-compatible options can be farther.

## Data import
Load `mallorca.seed.json`. Resolve `googlePlaceQuery` to a current Google Place ID through the existing Places service, but do not require network access for the seed to render. Cache photos/rating/review count/opening-hours metadata for offline use and show `lastUpdated`. Never treat cached `openNow` as current when offline.

## Verification before completion
1. Lisbon and Porto data remain unchanged and load successfully.
2. Mallorca appears as the next trip leg after Porto.
3. Each Mallorca day displays the correct `stayId`.
4. Editing/reordering Mallorca stops works offline.
5. Primary/backup swaps work for Sa Calobra and restaurant alternatives.
6. Formentor shows the restriction alert and TIB 334 action.
7. Google Places and Routes failures gracefully fall back to cached/planned data.
8. Web build and iOS Expo build both run without schema/migration errors.
9. No private booking codes, email addresses or payment details appear anywhere.

After implementation, summarize: files changed, DB migration performed, seed import path, commands run, tests passed, and any fields that still require live Google resolution.
