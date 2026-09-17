# Portugal Companion

A local-first Lisbon and Porto itinerary companion built with Expo, React
Native, TypeScript, Expo Router, and Expo SQLite.

## Run

```bash
pnpm install
pnpm web
```

For iOS, install Xcode and an iOS Simulator, then run:

```bash
pnpm ios
```

You can also scan the QR code from `pnpm start` with Expo Go. No API keys are required.

## Architecture

- `app/` — file-based routes and tabs
- `src/data/` — approved Lisbon seed itinerary
- `src/db/` — SQLite schema/native persistence and web local-storage adapter
- `src/context/` — editable itinerary state
- `src/services/` — future Google Places and Routes adapters
- `src/components/` — reusable travel UI

On iOS, edits persist in normalized SQLite tables for trips, cities, places,
days, segments, alternatives, and costs. The repository assembles those rows
into the nested `Trip` aggregate used by the UI. Version 1 JSON-payload
databases are migrated automatically.

On web, the same repository contract uses local storage because Expo SQLite
web support still requires cross-origin isolation headers and WASM
configuration. The app remains offline-capable on both.

## Delivery phases

1. **MVP itinerary app** — current build: Lisbon and Porto seed data,
   editing/reordering, place details, food trail, costs, Maps URLs, and offline
   persistence. The approved trip runs September 19–25, 2026, with three nights
   in each city.
2. **Dynamic companion** — scaffolded service contracts in `src/services/` for
   Google Places alternatives, metadata, and Google Routes ETAs. API keys
   should live behind a secure backend and field masks should request only
   required data.
3. **Cloud sync and expansion** — accounts, conflict handling, sharing,
   export, and Porto.

The MVP intentionally uses Google Maps URLs, which do not require a live API
key. No Google billing setup is needed to run this project.

## Place photos

Every place detail and itinerary card provides a consistent **Photos** action
that opens the establishment’s Google Maps listing, where current visitor,
menu, exterior, and review photos can be inspected.

The data model also supports `photoUrl` and `photoAttribution` for Phase 2.
When Google Places Photo is connected through the secure backend, returned
photos can render directly in the existing media card while preserving the
required attribution. The MVP does not scrape, copy, or cache Google review
photos.

## Optional coffee layer

Each Lisbon, Sintra, road-trip, Porto, Gaia, Foz, and Matosinhos day can expose
a collapsed **Need coffee nearby?** panel. The curated layer keeps every
approved itinerary stop intact and ranks cafés by route fit.

Coffee cards retain offline drink and pastry recommendations, review snapshots,
suggested timing, seating style, and Maps links. Cached `openNow` is never shown
as current while offline. Selecting **Add to day** creates a flexible,
reorderable itinerary segment without replacing an approved stop.
