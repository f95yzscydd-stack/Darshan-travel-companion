// Optional local adapter. Node 22+; no dependencies, dotenv loading, or startup API calls.
import { createServer, request as httpRequest } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLACES = 'https://places.googleapis.com/v1';
const ROUTES = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const BODY_LIMIT = 16 * 1024;
const UPSTREAM_LIMIT = 2 * 1024 * 1024;
const ID_TTL = 24 * 60 * 60 * 1000;
const MAX_ID_ENTRIES = 256;
const MAX_ACTIVE = 8;
const MAX_ALTERNATIVES = 8;
const CATEGORIES = new Set(['restaurant', 'cafe', 'bar', 'tourist_attraction']);
const MODES = { walking: 'WALK', transit: 'TRANSIT', driving: 'DRIVE', rideshare: 'DRIVE' };
const PRICE_LEVELS = [
  'PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE',
];
const DETAILS_MASK = 'id,rating,userRatingCount,photos,currentOpeningHours.openNow,regularOpeningHours.weekdayDescriptions,attributions';
const SEARCH_MASK = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'googleMapsUri',
  'location', 'types', 'priceLevel', 'rating', 'userRatingCount',
  'photos', 'currentOpeningHours.openNow', 'attributions',
].map((field) => `places.${field}`).join(',');
const ROUTE_MASK = 'routes.distanceMeters,routes.duration';
const PATHS = new Set(['/health', '/places/metadata', '/places/alternatives', '/routes/estimate']);

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const invalid = (message) => new ApiError(400, 'INVALID_INPUT', message);
const badUpstream = () => new ApiError(502, 'INVALID_UPSTREAM_RESPONSE', 'Google returned an unusable response.');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(value);

function object(value, allowed) {
  if (!isObject(value) || Object.keys(value).some((key) => !allowed.includes(key))) {
    throw invalid('Expected a JSON object with only the documented fields.');
  }
}

function string(value, label, maxLength = 500) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalid(`${label} must be a nonempty string of at most ${maxLength} characters without control characters.`);
  }
  return value.trim();
}

function number(value, label, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw invalid(`${label} must be a finite number between ${min} and ${max}.`);
  }
  return value;
}

function validate(path, body) {
  if (path === '/places/metadata') {
    object(body, ['query']);
    return { query: string(body.query, 'query') };
  }
  if (path === '/routes/estimate') {
    object(body, ['origin', 'destination', 'mode']);
    if (typeof body.mode !== 'string' || !Object.hasOwn(MODES, body.mode)) throw invalid('mode must be walking, transit, driving, or rideshare.');
    return { origin: string(body.origin, 'origin'), destination: string(body.destination, 'destination'), mode: body.mode };
  }
  object(body, ['location', 'radiusMeters', 'category', 'openNow', 'keyword', 'maxPriceLevel']);
  object(body.location, ['lat', 'lng']);
  const location = {
    lat: number(body.location.lat, 'location.lat', -90, 90),
    lng: number(body.location.lng, 'location.lng', -180, 180),
  };
  number(body.radiusMeters, 'radiusMeters', 0, 50000);
  if (body.radiusMeters === 0) throw invalid('radiusMeters must be greater than zero.');
  if (!CATEGORIES.has(body.category)) throw invalid('category must be restaurant, cafe, bar, or tourist_attraction.');
  if (body.openNow !== undefined && typeof body.openNow !== 'boolean') throw invalid('openNow must be a boolean.');
  if (body.maxPriceLevel !== undefined && (!Number.isInteger(body.maxPriceLevel) || body.maxPriceLevel < 0 || body.maxPriceLevel > 4)) {
    throw invalid('maxPriceLevel must be an integer from 0 (free) to 4 (very expensive).');
  }
  return {
    ...body, location,
    ...(body.keyword !== undefined ? { keyword: string(body.keyword, 'keyword', 200) } : {}),
  };
}

export function readConfig(env = process.env) {
  const portText = env.TRAVEL_API_PORT ?? '8787';
  if (!/^\d{1,5}$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    throw new Error('TRAVEL_API_PORT must be an integer from 1 to 65535.');
  }
  const host = env.TRAVEL_API_HOST ?? '127.0.0.1';
  if (!host || host.length > 253 || !/^[A-Za-z0-9.:-]+$/.test(host)) throw new Error('TRAVEL_API_HOST must be a hostname or IP address, without a scheme or port.');
  const origins = new Set();
  for (const entry of (env.TRAVEL_ALLOWED_ORIGINS ?? 'http://localhost:8081').split(',')) {
    try {
      const url = new URL(entry.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
      origins.add(url.origin);
    } catch {
      throw new Error('TRAVEL_ALLOWED_ORIGINS must contain comma-separated HTTP(S) origins; wildcards and null are not allowed.');
    }
  }
  const apiKey = (env.GOOGLE_MAPS_API_KEY ?? '').trim();
  if (apiKey.length > 512 || /[\u0000-\u0020\u007f]/.test(apiKey)) throw new Error('GOOGLE_MAPS_API_KEY has an invalid format.');
  return { host, port: Number(portText), origins, apiKey };
}

function readJson(req, timeoutMs) {
  if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type'] ?? '')) {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use Content-Type: application/json.');
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Compressed request bodies are not supported.');
  }
  if (Number(req.headers['content-length']) > BODY_LIMIT) throw new ApiError(413, 'BODY_TOO_LARGE', 'JSON body exceeds 16 KiB.');
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    const finish = (error, value) => {
      clearTimeout(timer);
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('aborted', onAborted);
      req.off('error', onAborted);
      if (error) { req.resume(); reject(error); } else resolveBody(value);
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) finish(new ApiError(413, 'BODY_TOO_LARGE', 'JSON body exceeds 16 KiB.'));
      else chunks.push(chunk);
    };
    const onEnd = () => {
      try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        finish(null, JSON.parse(text));
      } catch { finish(invalid('Body must be valid UTF-8 JSON.')); }
    };
    const onAborted = () => finish(invalid('Request body was interrupted.'));
    const timer = setTimeout(() => finish(new ApiError(408, 'REQUEST_TIMEOUT', 'Request body timed out.')), timeoutMs);
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('aborted', onAborted);
    req.once('error', onAborted);
  });
}

function safeUrl(value, apiKey, photo = false) {
  if (typeof value !== 'string' || value.length > 16000) throw badUpstream();
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    const decoded = decodeURIComponent(url.href);
    const host = url.hostname;
    const allowed = photo
      ? ['googleusercontent.com', 'ggpht.com'].some((domain) => host === domain || host.endsWith(`.${domain}`))
      : ['google.com', 'maps.app.goo.gl'].some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (!allowed || url.protocol !== 'https:' || url.username || url.password || url.port ||
        (apiKey && decoded.includes(apiKey)) || [...url.searchParams.keys()].some((key) => /^(key|api_?key|x-goog-api-key)$/i.test(key))) {
      throw badUpstream();
    }
    return url.href;
  } catch { throw badUpstream(); }
}

function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.lat) * rad;
  const dLng = (b.longitude - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

function createGoogleAdapter({ apiKey, fetchImpl, now, fetchTimeoutMs }) {
  // Only query -> place ID is cached. No photos, ratings, opening status, or routes.
  const ids = new Map();
  const pruneIds = () => {
    for (const [query, entry] of ids) if (entry.expires <= now()) ids.delete(query);
  };

  async function google(url, { body, mask, signal }) {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), fetchTimeoutMs);
    const combined = AbortSignal.any([signal, timeout.signal]);
    try {
      combined.throwIfAborted();
      const response = await fetchImpl(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': mask, 'Content-Type': 'application/json', Accept: 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: combined,
        // Never forward credentials across redirects, including photo redirects.
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 404) throw new ApiError(404, 'GOOGLE_NOT_FOUND', 'Google could not find the requested place, photo, or route.');
        if (response.status === 429) throw new ApiError(503, 'GOOGLE_QUOTA_EXCEEDED', 'Google quota is exhausted. Check server project quotas and billing.');
        if ([401, 403].includes(response.status)) throw new ApiError(502, 'GOOGLE_ACCESS_DENIED', 'Google denied access. Check server API restrictions, enabled APIs, billing, and quotas.');
        throw new ApiError(502, 'GOOGLE_REQUEST_FAILED', 'Google could not complete the request.');
      }
      if (!response.body) throw badUpstream();
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          combined.throwIfAborted();
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > UPSTREAM_LIMIT) { await reader.cancel(); throw badUpstream(); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      combined.throwIfAborted();
      let result;
      try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw badUpstream(); }
      if (!isObject(result) || result.error) throw badUpstream();
      return result;
    } catch (error) {
      if (combined.aborted) throw new ApiError(504, 'GOOGLE_TIMEOUT', 'Google request timed out or was cancelled.');
      if (error instanceof ApiError) throw error;
      // Do not reflect upstream bodies, URLs, exception messages, or credentials.
      throw new ApiError(502, 'GOOGLE_UNAVAILABLE', 'Google is unreachable or returned an invalid response.');
    } finally { clearTimeout(timer); }
  }

  async function metadata(place, signal, fetchedAt) {
    if (!isObject(place) || !validId(place.id)) throw badUpstream();
    const result = { googlePlaceId: place.id, lastUpdated: fetchedAt, source: 'google-maps' };
    if (Number.isFinite(place.rating) && place.rating >= 0 && place.rating <= 5) result.rating = place.rating;
    if (Number.isSafeInteger(place.userRatingCount) && place.userRatingCount >= 0) result.reviewCount = place.userRatingCount;
    if (typeof place.currentOpeningHours?.openNow === 'boolean') result.openNow = place.currentOpeningHours.openNow;
    if (Array.isArray(place.regularOpeningHours?.weekdayDescriptions)) {
      result.openingHours = place.regularOpeningHours.weekdayDescriptions.filter(value => typeof value === 'string');
    }
    const photo = Array.isArray(place.photos) ? place.photos[0] : undefined;
    if (photo) {
      // A photo name is used only within this request, and is never returned/stored.
      if (typeof photo.name !== 'string' || photo.name.length > 4096 || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photo.name) || !photo.name.startsWith(`places/${place.id}/photos/`)) throw badUpstream();
      const media = await google(`${PLACES}/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true`, { mask: 'photoUri', signal });
      result.photoUrl = safeUrl(media.photoUri, apiKey, true);
      const authors = Array.isArray(photo.authorAttributions) ? photo.authorAttributions : [];
      const credits = authors.map((author) => {
        if (typeof author?.displayName !== 'string' || !author.displayName.trim()) throw badUpstream();
        return author.uri ? `${author.displayName} (${safeUrl(author.uri, apiKey)})` : author.displayName;
      });
      result.photoAttribution = [...credits, 'Google Maps', ...(photo.googleMapsUri ? [safeUrl(photo.googleMapsUri, apiKey)] : [])].join(' · ');
    }
    // Preserve any provider attribution as visible plain text in the existing contract.
    if (Array.isArray(place.attributions) && place.attributions.length) {
      const credits = place.attributions.map((entry) => {
        if (typeof entry?.provider !== 'string' || !entry.provider.trim()) throw badUpstream();
        return entry.provider;
      });
      result.photoAttribution = [result.photoAttribution ?? 'Google Maps', ...credits].join(' · ');
    }
    return result;
  }

  function placesFrom(response) {
    // Google's protobuf JSON can omit an empty repeated field.
    if (response.places === undefined) return [];
    if (!Array.isArray(response.places) || response.places.some((place) => !isObject(place) || !validId(place.id))) throw badUpstream();
    return response.places.slice(0, 20);
  }

  async function getMetadata({ query }, signal) {
    pruneIds();
    const explicit = /^(?:places\/|place_id:)([A-Za-z0-9_-]{1,512})$/.exec(query)?.[1];
    // Common raw Google IDs are supported for the client's getPlaceMetadata(id).
    let id = explicit ?? (/^ChI[A-Za-z0-9_-]{16,509}$/.test(query) ? query : ids.get(query)?.id);
    if (!id) {
      const response = await google(`${PLACES}/places:searchText`, { body: { textQuery: query, pageSize: 1 }, mask: 'places.id', signal });
      id = placesFrom(response)[0]?.id;
      if (!id) throw new ApiError(404, 'PLACE_NOT_FOUND', 'No Google place matched the query. Include its city or address.');
      if (ids.size >= MAX_ID_ENTRIES) ids.delete(ids.keys().next().value);
      ids.set(query, { id, expires: now() + ID_TTL });
    }
    try {
      const place = await google(`${PLACES}/places/${encodeURIComponent(id)}`, { mask: DETAILS_MASK, signal });
      if (place.id !== id) throw badUpstream();
      return await metadata(place, signal, new Date(now()).toISOString());
    } catch (error) {
      // A stale/deleted ID must not poison future text lookups.
      if (error.status === 404) ids.delete(query);
      throw error;
    }
  }

  async function alternatives(params, signal) {
    const circle = { center: { latitude: params.location.lat, longitude: params.location.lng }, radius: params.radiusMeters };
    const body = params.keyword ? {
      textQuery: `${params.category.replaceAll('_', ' ')} ${params.keyword}`,
      includedType: params.category, strictTypeFiltering: true,
      locationBias: { circle }, pageSize: 20, rankPreference: 'DISTANCE',
      ...(params.openNow === true ? { openNow: true } : {}),
    } : {
      includedTypes: [params.category], locationRestriction: { circle },
      maxResultCount: 20, rankPreference: 'DISTANCE',
    };
    // Nearby has no keyword/openNow/price parameters. Filter those fields locally;
    // even Text Search's circle is only a bias, so enforce the radius ourselves.
    const response = await google(`${PLACES}/places:${params.keyword ? 'searchText' : 'searchNearby'}`, { body, mask: SEARCH_MASK, signal });
    const fetchedAt = new Date(now()).toISOString();
    const seen = new Set();
    const places = placesFrom(response).filter((place) => {
      const point = place.location;
      if (!Number.isFinite(point?.latitude) || !Number.isFinite(point?.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return false;
      if (distanceMeters(params.location, point) > params.radiusMeters) return false;
      if (!Array.isArray(place.types) || !place.types.includes(params.category)) return false;
      if (params.openNow === true && place.currentOpeningHours?.openNow !== true) return false;
      const price = PRICE_LEVELS.indexOf(place.priceLevel);
      if (params.maxPriceLevel !== undefined && (price < 0 || price > params.maxPriceLevel)) return false;
      if (typeof place.displayName?.text !== 'string' || !place.displayName.text.trim() || typeof place.formattedAddress !== 'string' || !place.formattedAddress.trim()) return false;
      if (seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    }).slice(0, MAX_ALTERNATIVES);
    if (!places.length) throw new ApiError(404, 'NO_ALTERNATIVES', 'No places with verified matching fields were found. Try a wider radius or fewer filters.');
    const results = new Array(places.length);
    let next = 0;
    // Bound photo fan-out while preserving Google's ordering.
    await Promise.all(Array.from({ length: Math.min(3, places.length) }, async () => {
      while (next < places.length) {
        const index = next++;
        const place = places[index];
        const components = Array.isArray(place.addressComponents) ? place.addressComponents : [];
        const city = ['locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2']
          .map((type) => components.find((part) => part.types?.includes(type))?.longText)
          .find((text) => typeof text === 'string' && text.trim()) ?? '';
        const mapsUrl = new URL('https://www.google.com/maps/search/');
        mapsUrl.search = new URLSearchParams({ api: '1', query: `${place.displayName.text} ${place.formattedAddress}`, query_place_id: place.id }).toString();
        results[index] = {
          id: place.id, name: place.displayName.text, city, category: params.category,
          address: place.formattedAddress,
          googleMapsUrl: place.googleMapsUri ? safeUrl(place.googleMapsUri, apiKey) : mapsUrl.href,
          metadata: await metadata(place, signal, fetchedAt), curated: false,
        };
      }
    }));
    return results;
  }

  async function estimate({ origin, destination, mode }, signal) {
    const travelMode = MODES[mode];
    const response = await google(ROUTES, {
      body: {
        origin: { address: origin }, destination: { address: destination }, travelMode,
        ...(travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      }, mask: ROUTE_MASK, signal,
    });
    if (response.routes !== undefined && !Array.isArray(response.routes)) throw badUpstream();
    const route = response.routes?.[0];
    if (!route) throw new ApiError(404, 'ROUTE_NOT_FOUND', 'Google found no route for these addresses and travel mode.');
    if (!Number.isSafeInteger(route.distanceMeters) || route.distanceMeters < 0 || typeof route.duration !== 'string' || !/^\d+(?:\.\d{1,9})?s$/.test(route.duration)) throw badUpstream();
    const seconds = Number(route.duration.slice(0, -1));
    if (!Number.isFinite(seconds) || seconds < 0) throw badUpstream();
    return { distanceMeters: route.distanceMeters, durationMinutes: seconds / 60, lastUpdated: new Date(now()).toISOString() };
  }

  return { getMetadata, alternatives, estimate };
}

// Injection points are for local tests only; HTTP callers cannot override them.
export function createTravelApiServer({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now, fetchTimeoutMs = 6000, operationTimeoutMs = 9000, bodyTimeoutMs = 5000 } = {}) {
  const config = readConfig(env);
  const adapter = createGoogleAdapter({ ...config, fetchImpl, now, fetchTimeoutMs });
  let active = 0;
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 5000, keepAliveTimeout: 5000 }, async (req, res) => {
    // IncomingMessage can emit an error after an aborted event/finished body read.
    // Body/operation cancellation is handled separately; never crash on disconnect.
    req.on('error', () => {});
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const send = (status, value) => {
      if (res.destroyed || res.writableEnded) return;
      let text = JSON.stringify(value);
      // Final defense if any unexpected upstream field contains a credential.
      if (config.apiKey && [config.apiKey, encodeURIComponent(config.apiKey)].some((key) => text.includes(key))) {
        status = 502;
        text = JSON.stringify({ error: { code: 'INVALID_UPSTREAM_RESPONSE', message: 'Google returned an unusable response.' } });
      }
      res.writeHead(status, { 'Content-Length': Buffer.byteLength(text) });
      res.end(req.method === 'HEAD' ? undefined : text);
    };
    let controller;
    let operationTimer;
    let counted = false;
    const cancel = () => { if (!res.writableEnded) controller?.abort(); };
    try {
      const origin = req.headers.origin;
      if (origin !== undefined) {
        if (!config.origins.has(origin)) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This browser origin is not allowed.');
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      if (!req.url || req.url.length > 2048 || !req.url.startsWith('/')) throw invalid('Invalid request URL.');
      const { pathname } = new URL(req.url, 'http://127.0.0.1');
      if (!PATHS.has(pathname)) throw new ApiError(404, 'NOT_FOUND', 'Endpoint not found.');
      const methods = pathname === '/health' ? ['GET', 'HEAD'] : ['POST'];
      if (req.method === 'OPTIONS') {
        const requestedMethod = req.headers['access-control-request-method'];
        const requestedHeaders = (req.headers['access-control-request-headers'] ?? '').split(',').map((header) => header.trim().toLowerCase()).filter(Boolean);
        if ((requestedMethod && !methods.includes(requestedMethod)) || requestedHeaders.some((header) => header !== 'content-type')) {
          throw new ApiError(403, 'PREFLIGHT_NOT_ALLOWED', 'Requested CORS method or headers are not allowed.');
        }
        res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '600');
        res.writeHead(204);
        res.end();
        return;
      }
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', [...methods, 'OPTIONS'].join(', '));
        throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Method is not allowed for this endpoint.');
      }
      if (pathname === '/health') {
        send(200, { status: 'ok', googleMapsConfigured: Boolean(config.apiKey) });
        return;
      }
      const input = validate(pathname, await readJson(req, bodyTimeoutMs));
      if (!config.apiKey) throw new ApiError(503, 'NOT_CONFIGURED', 'Set GOOGLE_MAPS_API_KEY on the local server to enable Google Places and Routes.');
      if (active >= MAX_ACTIVE) throw new ApiError(503, 'SERVER_BUSY', 'Too many requests are in progress. Try again shortly.');
      counted = true;
      active++;
      controller = new AbortController();
      operationTimer = setTimeout(() => controller.abort(), operationTimeoutMs);
      req.once('aborted', cancel);
      res.once('close', cancel);
      const handler = pathname === '/places/metadata' ? adapter.getMetadata : pathname === '/places/alternatives' ? adapter.alternatives : adapter.estimate;
      send(200, await handler(input, controller.signal));
    } catch (error) {
      controller?.abort();
      const safe = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'The travel service could not complete the request.');
      if (!req.complete || [408, 413].includes(safe.status)) {
        res.setHeader('Connection', 'close');
        req.resume();
      }
      send(safe.status, { error: { code: safe.code, message: safe.message } });
    } finally {
      clearTimeout(operationTimer);
      req.off('aborted', cancel);
      res.off('close', cancel);
      if (counted) active--;
    }
  });
  server.maxConnections = 64;
  server.on('clientError', (_error, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  return server;
}

// Kept in this owned file so verification needs no dependency or package edits.
async function selfTest() {
  const { default: assert } = await import('node:assert/strict');
  const calls = [];
  const fakeKey = 'offline-test-credential-not-a-real-key';
  let clock = Date.UTC(2026, 8, 10, 12);
  let respond = () => { throw new Error('Unexpected Google fetch in offline test'); };
  const fakeFetch = async (url, options) => {
    assert.ok(String(url).startsWith(PLACES) || url === ROUTES);
    assert.ok(!String(url).includes(fakeKey));
    assert.equal(options.headers['X-Goog-Api-Key'], fakeKey);
    assert.ok(options.headers['X-Goog-FieldMask']);
    assert.ok(!options.headers['X-Goog-FieldMask'].includes('*'));
    assert.equal(options.redirect, 'error');
    const call = { url: String(url), options, body: options.body ? JSON.parse(options.body) : undefined };
    calls.push(call);
    return respond(call);
  };
  const servers = [];
  const start = async (configured, overrides = {}) => {
    const server = createTravelApiServer({
      env: configured ? { GOOGLE_MAPS_API_KEY: fakeKey } : {}, fetchImpl: fakeFetch,
      now: () => clock, fetchTimeoutMs: 50, operationTimeoutMs: 150, bodyTimeoutMs: 50,
      ...overrides,
    });
    await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
  };
  const local = async (base, path, body, options = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...options,
    });
    const text = await response.text();
    assert.ok(!text.includes(fakeKey));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return { response, status: response.status, body: text ? JSON.parse(text) : undefined };
  };
  let checks = 0;
  const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
  const validSearch = { location: { lat: 38.72, lng: -9.14 }, radiusMeters: 1000, category: 'cafe' };
  const validRoute = { origin: 'Rossio, Lisbon', destination: 'Alfama, Lisbon', mode: 'walking' };
  try {
    check(readConfig({}).host, '127.0.0.1');
    check(readConfig({}).port, 8787);
    check([...readConfig({}).origins], ['http://localhost:8081']);
    check(readConfig({ TRAVEL_API_HOST: '0.0.0.0', TRAVEL_API_PORT: '9000' }).port, 9000);
    for (const env of [{ TRAVEL_API_PORT: '0' }, { TRAVEL_API_PORT: '8787oops' }, { TRAVEL_ALLOWED_ORIGINS: '*' }, { TRAVEL_ALLOWED_ORIGINS: 'null' }, { TRAVEL_ALLOWED_ORIGINS: 'https://example.com/path' }]) {
      assert.throws(() => readConfig(env)); checks++;
    }
    const unconfigured = await start(false);
    check((await local(unconfigured, '/health', undefined, { method: 'GET' })).body, { status: 'ok', googleMapsConfigured: false });
    for (const [path, body] of [['/places/metadata', { query: 'Cafe, Lisbon' }], ['/places/alternatives', validSearch], ['/routes/estimate', validRoute]]) {
      const result = await local(unconfigured, path, body);
      check(result.status, 503); check(result.body.error.code, 'NOT_CONFIGURED');
    }
    for (const [path, body] of [
      ['/places/metadata', {}], ['/places/metadata', []], ['/places/metadata', null], ['/places/metadata', { query: ' ' }],
      ['/places/metadata', { query: 'x'.repeat(501) }], ['/places/metadata', { query: 'x\n' }], ['/places/metadata', { query: 'ok', apiKey: 'no' }],
      ['/places/alternatives', { ...validSearch, location: { lat: 91, lng: 0 } }],
      ['/places/alternatives', { ...validSearch, location: { lat: 0, lng: 181 } }],
      ['/places/alternatives', { ...validSearch, location: { lat: '0', lng: 0 } }],
      ['/places/alternatives', { ...validSearch, radiusMeters: 0 }], ['/places/alternatives', { ...validSearch, radiusMeters: 50001 }],
      ['/places/alternatives', { ...validSearch, category: 'invalid' }], ['/places/alternatives', { ...validSearch, openNow: 'true' }],
      ['/places/alternatives', { ...validSearch, maxPriceLevel: 1.5 }], ['/places/alternatives', { ...validSearch, keyword: '' }],
      ['/routes/estimate', { ...validRoute, origin: {} }], ['/routes/estimate', { ...validRoute, mode: 'toString' }],
      ['/routes/estimate', { ...validRoute, mode: ['walking'] }], ['/routes/estimate', { ...validRoute, mode: { toString: null } }],
    ]) check((await local(unconfigured, path, body)).status, 400);
    check((await local(unconfigured, '/places/metadata', undefined, { body: '{' })).status, 400);
    check((await local(unconfigured, '/places/metadata', { query: 'x' }, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
    check((await local(unconfigured, '/places/metadata', { query: 'x'.repeat(BODY_LIMIT) })).status, 413);
    check((await local(unconfigured, '/missing', {})).status, 404);
    check((await local(unconfigured, '/places/metadata', undefined, { method: 'GET' })).status, 405);
    check((await local(unconfigured, '/places/metadata', {}, { headers: { Origin: 'https://evil.example' } })).status, 403);
    const preflight = await local(unconfigured, '/places/metadata', undefined, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    check(preflight.status, 204);
    check(preflight.response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    check((await local(unconfigured, '/places/metadata', undefined, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'DELETE' } })).status, 403);
    check((await local(unconfigured, '/places/metadata', undefined, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Headers': 'authorization' } })).status, 403);
    const allowed = await local(unconfigured, '/places/metadata', { query: 'Cafe' }, { headers: { Origin: 'http://localhost:8081', 'Content-Type': 'application/json' } });
    check(allowed.status, 503);
    check(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    check(allowed.response.headers.get('access-control-allow-credentials'), null);
    check((await local(unconfigured, '/places/metadata', {}, { headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' } })).status, 415);
    check((await local(unconfigured, '/health', undefined, { method: 'HEAD' })).status, 200);
    check(calls.length, 0);

    // Chunked overflow and slow bodies use only the loopback HTTP server.
    const raw = (chunks, end = true) => new Promise((done, reject) => {
      const req = httpRequest(`${unconfigured}/places/metadata`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
        res.resume(); res.on('end', () => { done(res.statusCode); req.destroy(); });
      });
      req.on('error', reject);
      for (const chunk of chunks) req.write(chunk);
      if (end) req.end();
    });
    check(await raw(['{"query":"', 'x'.repeat(BODY_LIMIT), '"}']), 413);
    check(await raw(['{'], false), 408);
    await new Promise((done) => {
      const req = httpRequest(`${unconfigured}/places/metadata`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      req.on('error', () => {});
      req.write('{');
      setTimeout(() => { req.destroy(); done(); }, 10);
    });
    check((await local(unconfigured, '/health', undefined, { method: 'GET' })).status, 200);

    const configured = await start(true);
    check((await local(configured, '/health', undefined, { method: 'GET' })).body.googleMapsConfigured, true);
    check(calls.length, 0);
    const place = {
      id: 'ChIJOfflineFixture00001', displayName: { text: 'Offline Cafe' }, formattedAddress: 'Test street, Lisbon',
      addressComponents: [{ longText: 'Lisbon', types: ['locality'] }],
      location: { latitude: 38.7201, longitude: -9.14 }, types: ['cafe'], priceLevel: 'PRICE_LEVEL_FREE',
      rating: 4.5, userRatingCount: 0, currentOpeningHours: { openNow: false },
      photos: [{ name: 'places/ChIJOfflineFixture00001/photos/OfflinePhoto', authorAttributions: [{ displayName: 'Test Photographer', uri: 'https://maps.google.com/maps/contrib/123' }] }],
    };
    respond = ({ url }) => Response.json(url.includes(':searchText') ? { places: [{ id: place.id }] } : url.includes('/media?') ? { photoUri: 'https://lh3.googleusercontent.com/offline-fixture' } : place);
    const first = await local(configured, '/places/metadata', { query: 'Offline Cafe Lisbon' });
    check(first.status, 200); check(first.body.reviewCount, 0); check(first.body.openNow, false);
    check(first.body.source, 'google-maps'); check(first.body.rating, 4.5);
    assert.match(first.body.photoAttribution, /Test Photographer/); checks++;
    check(first.body.photoUrl, 'https://lh3.googleusercontent.com/offline-fixture');
    check(calls.at(-3).body.pageSize, 1);
    check(calls.at(-2).options.headers['X-Goog-FieldMask'], DETAILS_MASK);
    check(calls.at(-1).options.headers['X-Goog-FieldMask'], 'photoUri');
    const before = calls.length;
    clock += 16 * 60 * 1000;
    delete place.currentOpeningHours;
    const refreshed = await local(configured, '/places/metadata', { query: 'Offline Cafe Lisbon' });
    check(calls.length - before, 2); // ID cache skips search, never details/photo.
    check(Object.hasOwn(refreshed.body, 'openNow'), false);
    check(refreshed.body.lastUpdated, new Date(clock).toISOString());
    clock += ID_TTL;
    const beforeExpiry = calls.length;
    check((await local(configured, '/places/metadata', { query: 'Offline Cafe Lisbon' })).status, 200);
    check(calls.length - beforeExpiry, 3);
    check((await local(configured, '/places/metadata', { query: `places/${place.id}` })).status, 200);
    check((await local(configured, '/places/metadata', { query: place.id })).status, 200);

    place.currentOpeningHours = { openNow: true };
    delete place.photos;
    const excluded = [
      { ...place, id: 'closed', currentOpeningHours: { openNow: false } },
      { ...place, id: 'unknown', currentOpeningHours: undefined },
      { ...place, id: 'expensive', priceLevel: 'PRICE_LEVEL_EXPENSIVE' },
      { ...place, id: 'unknown-price', priceLevel: undefined },
      { ...place, id: 'distant', location: { latitude: 40, longitude: -9 } },
      { ...place, id: 'wrong-category', types: ['bar'] },
    ];
    respond = () => Response.json({ places: [place, ...excluded, place] });
    const nearby = await local(configured, '/places/alternatives', { ...validSearch, openNow: true, maxPriceLevel: 0 });
    check(nearby.status, 200); check(nearby.body.length, 1); check(nearby.body[0].curated, false);
    check(nearby.body[0].city, 'Lisbon'); check(nearby.body[0].metadata.openNow, true);
    check(calls.at(-1).body.includedTypes, ['cafe']);
    check(Object.hasOwn(calls.at(-1).body, 'openNow'), false);
    check((await local(configured, '/places/alternatives', { ...validSearch, openNow: true, keyword: 'espresso', maxPriceLevel: 0 })).body.length, 1);
    check(calls.at(-1).body.strictTypeFiltering, true);
    check(calls.at(-1).body.locationBias.circle.radius, 1000);
    check(Object.hasOwn(calls.at(-1).body, 'priceLevels'), false);
    check((await local(configured, '/places/alternatives', { ...validSearch, openNow: false })).body.length, 5);
    respond = () => Response.json({ places: Array.from({ length: 20 }, (_, i) => ({ ...place, id: `result-${i}` })) });
    check((await local(configured, '/places/alternatives', validSearch)).body.length, MAX_ALTERNATIVES);
    respond = () => Response.json({});
    check((await local(configured, '/places/alternatives', validSearch)).status, 404);
    check((await local(configured, '/places/metadata', { query: 'No match' })).status, 404);
    check((await local(configured, '/routes/estimate', validRoute)).status, 404);
    respond = () => Response.json({ places: 'bad' });
    check((await local(configured, '/places/alternatives', validSearch)).status, 502);

    respond = () => Response.json({ routes: [{ distanceMeters: 1200, duration: '90.5s' }] });
    for (const mode of Object.keys(MODES)) {
      const result = await local(configured, '/routes/estimate', { ...validRoute, mode });
      check(result.status, 200); check(result.body.distanceMeters, 1200); check(result.body.durationMinutes, 90.5 / 60);
      check(calls.at(-1).body.origin, { address: validRoute.origin });
      check(calls.at(-1).body.destination, { address: validRoute.destination });
      check(calls.at(-1).body.travelMode, MODES[mode]);
      check(calls.at(-1).body.routingPreference, MODES[mode] === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined);
    }
    for (const route of [{ duration: '90s' }, { distanceMeters: 1, duration: 'n/a' }, { distanceMeters: -1, duration: '1s' }]) {
      respond = () => Response.json({ routes: [route] });
      check((await local(configured, '/routes/estimate', validRoute)).status, 502);
    }
    respond = () => Response.json({ routes: [{ distanceMeters: 0, duration: '0s' }] });
    check((await local(configured, '/routes/estimate', validRoute)).body.durationMinutes, 0);
    const beforeRouteRefresh = calls.length;
    clock += 60 * 1000;
    check((await local(configured, '/routes/estimate', validRoute)).body.lastUpdated, new Date(clock).toISOString());
    check(calls.length - beforeRouteRefresh, 1);
    for (const status of [400, 401, 403, 404, 429, 500]) {
      respond = () => Response.json({ error: { message: fakeKey } }, { status });
      check((await local(configured, '/routes/estimate', validRoute)).status, status === 404 ? 404 : status === 429 ? 503 : 502);
    }
    respond = () => { throw new Error(fakeKey); };
    check((await local(configured, '/routes/estimate', validRoute)).status, 502);
    respond = () => new Response('invalid JSON');
    check((await local(configured, '/routes/estimate', validRoute)).status, 502);
    respond = () => new Response('x'.repeat(UPSTREAM_LIMIT + 1));
    check((await local(configured, '/routes/estimate', validRoute)).status, 502);
    respond = ({ options }) => new Promise((_done, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error(fakeKey)), { once: true });
    });
    check((await local(configured, '/routes/estimate', validRoute)).status, 504);
    for (const url of [`https://lh3.googleusercontent.com/photo?key=${fakeKey}`, 'https://places.googleapis.com/v1/photo', 'http://lh3.googleusercontent.com/photo', 'https://evil.example/photo']) {
      assert.throws(() => safeUrl(url, fakeKey, true)); checks++;
    }
    place.photos = [{ name: `places/${place.id}/photos/OfflinePhoto`, authorAttributions: [] }];
    respond = ({ url }) => url.includes('/media?') ? Response.json({ error: { message: fakeKey } }, { status: 403 }) : Response.json(place);
    check((await local(configured, '/places/metadata', { query: place.id })).status, 502);
    respond = ({ url }) => Response.json(url.includes('/media?') ? { photoUri: `https://lh3.googleusercontent.com/photo?key=${fakeKey}` } : place);
    check((await local(configured, '/places/metadata', { query: place.id })).status, 502);
    // Final output guard also protects non-URL text fields.
    delete place.photos;
    place.attributions = [{ provider: fakeKey }];
    respond = () => Response.json(place);
    check((await local(configured, '/places/metadata', { query: place.id })).status, 502);
    delete place.attributions;

    const slowServer = await start(true, { fetchTimeoutMs: 200, operationTimeoutMs: 50 });
    respond = ({ options }) => new Promise((_done, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
    });
    check((await local(slowServer, '/routes/estimate', validRoute)).status, 504);

    const busyServer = await start(true, { fetchTimeoutMs: 1000, operationTimeoutMs: 1200 });
    let pendingStarted = 0;
    let releasePending;
    let allPending;
    const ready = new Promise((done) => { allPending = done; });
    const release = new Promise((done) => { releasePending = done; });
    respond = async () => {
      if (++pendingStarted === MAX_ACTIVE) allPending();
      await release;
      return Response.json({ routes: [{ distanceMeters: 100, duration: '60s' }] });
    };
    const pending = Array.from({ length: MAX_ACTIVE }, () => local(busyServer, '/routes/estimate', validRoute));
    await ready;
    try {
      const busy = await local(busyServer, '/routes/estimate', validRoute);
      check(busy.status, 503); check(busy.body.error.code, 'SERVER_BUSY');
    } finally { releasePending(); }
    for (const result of await Promise.all(pending)) check(result.status, 200);

    // A disconnected client must cancel a billable operation already in progress.
    let notifyStarted;
    let notifyAborted;
    const started = new Promise((done) => { notifyStarted = done; });
    const aborted = new Promise((done) => { notifyAborted = done; });
    respond = ({ options }) => new Promise((_done, reject) => {
      notifyStarted();
      options.signal.addEventListener('abort', () => { notifyAborted(); reject(new Error('cancelled')); }, { once: true });
    });
    const abortController = new AbortController();
    const disconnected = fetch(`${busyServer}/routes/estimate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validRoute), signal: abortController.signal }).catch(() => {});
    await started;
    abortController.abort();
    await disconnected;
    await aborted;
    checks++;
    check((await local(busyServer, '/health', undefined, { method: 'GET' })).status, 200);
    console.log(`PASS: ${checks} local checks; Google requests used an in-memory stub only. No real API calls.`);
  } finally {
    await Promise.all(servers.map((server) => new Promise((done) => { server.close(done); server.closeAllConnections(); })));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--self-test')) {
    await selfTest();
  } else {
    try {
      const { host, port, apiKey } = readConfig();
      const server = createTravelApiServer();
      server.on('error', (error) => {
        console.error(error.code === 'EADDRINUSE' ? 'Travel API port is already in use.' : 'Travel API could not start. Check host, port, and network permissions.');
        process.exitCode = 1;
      });
      server.listen(port, host, () => {
        const displayHost = host.includes(':') ? `[${host}]` : host;
        console.log(`Travel API listening at http://${displayHost}:${port}; Google ${apiKey ? 'configured' : 'not configured (Google endpoints return 503)'}.`);
      });
      const stop = () => {
        server.close(() => process.exit(0));
        setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 2000).unref();
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    } catch {
      console.error('Invalid travel API configuration. Check GOOGLE_MAPS_API_KEY, TRAVEL_API_PORT, TRAVEL_API_HOST, and TRAVEL_ALLOWED_ORIGINS; see server/README.md.');
      process.exitCode = 1;
    }
  }
}
