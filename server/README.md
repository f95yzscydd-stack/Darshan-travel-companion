# Optional local travel API

Dependency-free Node HTTP adapter for the existing Expo client. Requires Node 22+ (built-in `fetch`); install nothing and make no package, model, or app changes. Run commands from the repository root.

## Start without a key

```sh
node server/travel-api.mjs
```

The default listener is `http://127.0.0.1:8787`. `GET /health` returns `{"status":"ok","googleMapsConfigured":false}`. Valid Google endpoint requests return HTTP 503 `NOT_CONFIGURED`; they never return fabricated metadata, empty successful alternatives, or planning estimates. Startup, health checks, preflights, and invalid input make no Google calls. Health confirms configuration presence, not credential validity or Google availability.

In the Expo terminal, set the **backend URL, never the Google key**, and restart the existing web command:

```sh
EXPO_PUBLIC_TRAVEL_API_URL=http://localhost:8787 pnpm web -- --port 8081
```

The API is optional. Leave `EXPO_PUBLIC_TRAVEL_API_URL` unset to retain the client's offline behavior. This server does not read `.env` files automatically; use your shell environment, or Node's explicit `--env-file` with a private, git-ignored file outside the Expo project. Do not put `GOOGLE_MAPS_API_KEY` in any `EXPO_PUBLIC_*` variable or committed file.

## Enable live Google data

Create a Google Cloud project with billing and enable **Places API (New)** and **Routes API**. Restrict a server API key to those APIs and, where practical, the server's outbound public IP. Browser HTTP-referrer restrictions are inappropriate for this server-side key. Set quotas and billing alerts before live use. These APIs are billable, and requested rating/open-hours fields affect the Places SKU. See Google's [Places setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key), [Places billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), and [Routes setup](https://developers.google.com/maps/documentation/routes/get-api-key).

Supply `GOOGLE_MAPS_API_KEY` privately to the server process, then run the same Node command. No keys are included in this repository. Merely starting the server does not call Google; valid client requests do once configured. A metadata lookup uses Text Search for an ID, Place Details, and one photo-media request when a photo exists. Alternatives use one search and up to eight photo-media requests. A route refresh uses one Compute Routes request. There are no automatic retries or background polling.

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | Unset | Server-only Google credential |
| `TRAVEL_API_PORT` | `8787` | Integer 1–65535 |
| `TRAVEL_API_HOST` | `127.0.0.1` | Listening interface; use `0.0.0.0` explicitly for LAN access |
| `TRAVEL_ALLOWED_ORIGINS` | `http://localhost:8081` | Comma-separated exact HTTP(S) browser origins; no `*` or `null` |
| `EXPO_PUBLIC_TRAVEL_API_URL` | Unset, client only | Base URL reachable by Expo, without endpoint suffix |

## Phones, emulators, and LAN access

On a physical phone, `localhost` means the phone, not your computer. Use the computer's actual LAN IP for `EXPO_PUBLIC_TRAVEL_API_URL`, connect both devices to the same trusted network, and allow inbound TCP 8787 through the computer's firewall. For example, replacing `192.168.1.20` with your computer's address:

```sh
TRAVEL_API_HOST=0.0.0.0 \
TRAVEL_ALLOWED_ORIGINS=http://localhost:8081,http://192.168.1.20:8081 \
node server/travel-api.mjs

EXPO_PUBLIC_TRAVEL_API_URL=http://192.168.1.20:8787 pnpm start
```

The iOS simulator can usually reach the host at `localhost`; the standard Android emulator uses `10.0.2.2` for the host, with a reachable server bind. Native requests usually have no `Origin`; those are accepted. Browser requests need their precise scheme, host, and port in the allowlist (`127.0.0.1` differs from `localhost`). Do not use `0.0.0.0` as the client URL. Expo's tunnel does not automatically expose this separate server. An HTTPS web app cannot call an insecure HTTP backend without mixed-content restrictions. Native release builds may also restrict cleartext HTTP; use a separately secured HTTPS endpoint for release deployment.

This is a trusted-local-development server, not an authenticated production service. CORS is not authentication; non-browser clients can call a reachable listener. Do not port-forward it or expose it publicly. Production needs TLS, authentication, per-user rate limits, abuse controls, and appropriate privacy/retention policies. Addresses and place queries are sent to Google only when the key is configured and a valid request is made.

## HTTP contract

All POST requests require `Content-Type: application/json`. Bodies must contain only documented fields. Unknown fields, coercible strings in numeric fields, invalid JSON, null/array bodies, invalid modes, and invalid categories are rejected before any Google call.

### `POST /places/metadata`

```json
{"query":"Cafe name, Lisbon, Portugal"}
```

`query` is a nonempty string up to 500 characters. Supply the city/address to disambiguate. The most relevant Text Search result is used; identity is not independently verified. A common raw `ChI…` place ID, `places/PLACE_ID`, or `place_id:PLACE_ID` goes directly to Details (use the explicit forms for other ID formats).

Returns a `GooglePlaceMetadata` object with `googlePlaceId`, `source: "google-maps"`, an ISO `lastUpdated`, and Google's available `rating`, `reviewCount`, `photoUrl`, `photoAttribution`, and `openNow`. Missing values are omitted, never invented or replaced with zero/false. Real zero review counts and explicit `openNow: false` are preserved. There are no generated review summaries, dishes, or crowd-level claims.

### `POST /places/alternatives`

```json
{
  "location":{"lat":38.72,"lng":-9.14},
  "radiusMeters":1000,
  "category":"cafe",
  "openNow":true,
  "keyword":"espresso",
  "maxPriceLevel":2
}
```

Latitude is -90…90, longitude -180…180, radius greater than zero and at most 50,000 meters. Categories match the client: `restaurant`, `cafe`, `bar`, `tourist_attraction`. Optional `keyword` is a nonempty string up to 200 characters. Optional `maxPriceLevel` is an integer 0–4 (free, inexpensive, moderate, expensive, very expensive). Unknown prices are excluded when a price ceiling is requested. `openNow: true` excludes closed/unknown status; false or omitted does **not** mean “closed only.”

Without a keyword, the adapter uses Nearby Search (New) with a circular restriction. With a keyword, it uses Text Search (New) with category filtering and a circular location bias. It enforces actual radius, category, price, and open-status constraints locally on both paths. Unsupported Nearby parameters are not sent to Google. The adapter checks up to 20 candidates, does not paginate, and returns up to eight matching `AlternativePlace` objects. Fewer results do not mean no other matches exist. Text Search may bias outside the circle; such results are excluded. Free-price filtering is local because Text Search does not accept `PRICE_LEVEL_FREE` as a request filter. See [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search) and the [Nearby Search reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchNearby).

Each result has `id` (the Google place ID), `name`, `city`, `category`, `address`, `googleMapsUrl`, `metadata`, and `curated: false`. City comes from address components, or an empty string if Google omits it; it is never guessed from the user's location. No matches produce a descriptive HTTP 404, not a fake 200 `[]`.

### `POST /routes/estimate`

```json
{"origin":"Rossio, Lisbon","destination":"Alfama, Lisbon","mode":"walking"}
```

Origin/destination are nonempty **address strings** up to 500 characters. Modes map to Google `WALK`, `TRANSIT`, or `DRIVE`; `rideshare` means a driving estimate, not a ride quote or pickup wait. Driving/rideshare request `TRAFFIC_AWARE`. Other modes omit that driving-only preference. Every call recalculates for the current departure time; there is no route cache or itinerary-date scheduling in this contract. Returns numeric `distanceMeters`, numeric `durationMinutes` (fractional minutes are preserved), and an ISO `lastUpdated`. A missing/unusable route is an error, never a substituted estimate. See [Compute Routes](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes) and [address waypoints](https://developers.google.com/maps/documentation/routes/specify_location).

### Errors and limits

Errors are JSON: `{"error":{"code":"NOT_CONFIGURED","message":"…"}}`. Statuses include 400 invalid input, 403 rejected browser origin/preflight, 404 no match/route or unknown endpoint, 405 wrong method, 408 slow request body, 413 body too large, 415 unsupported content type/encoding, 502 Google access/response failures, 503 unconfigured/quota/busy, and 504 Google timeout. Google error bodies and exception messages are never reflected. Photo retrieval failures fail the request; no successful-looking photo placeholder is fabricated.

Limits: 16 KiB streamed request body, 8 KiB HTTP headers, 2 MiB upstream JSON, 5-second body deadline, 6-second individual fetch deadline, 9-second total Google-operation deadline, eight concurrent operations, three photo requests at a time per alternatives request, and 64 connections. The operation deadline is below the existing client's 12-second timeout. Browser CORS grants only the allowlisted origin, documented methods, and `Content-Type`; no credentials or wildcard grant.

## Freshness, photos, and attribution

Only query-to-place-ID lookups are cached, in memory, for at most 24 hours and 256 entries. Ratings, review counts, opening status, Routes results, photo resource names, and photos are not cached or persisted by this server. All HTTP responses use `Cache-Control: no-store`. Details and photo media are retrieved anew even on an ID-cache hit, and failed ID lookups can be retried. Timestamps represent the actual upstream metadata fetch, not when a client displays its saved snapshot. `openNow` is omitted if Google did not provide it; it is a momentary observation, not a guarantee for a planned visit.

The app's separate cached snapshots must retain their original timestamps and visibly distinguish historical/cached values. Its current open-status guard expires after 15 minutes; never extend that lifetime by relabeling an old snapshot as newly fetched. Do not persist an open assertion indefinitely. Google restricts storage of Places content, with an exception for place IDs; review applicable terms before retaining other content in client storage. Photo names may expire and must not be cached. See [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) and [Place Photos](https://developers.google.com/maps/documentation/places/web-service/place-photos).

Photo media uses `skipHttpRedirect=true` with the server key in an HTTP header. The response contains only a validated, short-lived HTTPS Google image URL, never an API endpoint with a key. Photo resource names are not exposed. If an image URL expires, refresh metadata. Photo requests use an explicit `photoUri` field mask; all searches, Details, and Routes likewise request explicit fields rather than `*`. See the [photo media reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places.photos/getMedia) and [field-mask guide](https://developers.google.com/maps/documentation/places/web-service/choose-fields).

Keep `photoAttribution` **visible beside every rendered photo**, not only in alt text or a tooltip. It carries author names, available author profile/source URLs as plain text, and Google Maps attribution. The existing photo card renders this string. Do not hide, truncate away, or interpret it as HTML. The client remains responsible for Google's full attribution presentation, source links, any supplied third-party provider credits (including when no photo is present), and Terms/Privacy disclosures. This backend alone cannot guarantee UI compliance. Walking-route displays also need Google's warning that walking routes may omit clear sidewalks/pedestrian paths; see [route options](https://developers.google.com/maps/documentation/routes/route-opt).

## Local verification — no Google calls

```sh
node --check server/travel-api.mjs
node server/travel-api.mjs --self-test
```

The self-test binds temporary loopback ports and substitutes an in-memory fetch stub for **every** Google request, ignoring real environment keys. It checks missing-key behavior and zero upstream calls, health, input/media/method validation, declared/chunked body limits, slow bodies, CORS, normalization, fresh open status, bounded-lifetime ID caching, photos/attribution, keyword/nearby filters, all route modes, missing results, malformed upstream responses, fetch/operation timeouts, concurrency limits, client-disconnect cancellation, and credential-safe errors/URLs. No credentials, paid API access, or internet are needed. Sandbox environments must allow local socket binding. These checks do not prove real credential validity, billing configuration, live search relevance, coverage, or device networking; those remain untested until an operator deliberately supplies a key and exercises the app.

Verification result: syntax check passed; all 155 offline checks passed.

API shapes and constraints were checked against the linked official `developers.google.com/maps` documentation on 2026-09-10. No actual Google API calls were made during implementation verification.
