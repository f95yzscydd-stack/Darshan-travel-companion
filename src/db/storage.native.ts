import * as SQLite from 'expo-sqlite';
import {
  DATABASE_VERSION,
  mallorcaColumns,
  legacyTripColumns,
  placeMetadataColumns,
  schema,
  TRIP_SNAPSHOT_KEY
} from '@/src/db/schema';
import { TripRepository } from '@/src/db/repository';
import {
  AlternativePlace,
  CityPlan,
  CostEntry,
  ItineraryDay,
  ItinerarySegment,
  Place,
  SyncStatus,
  TravelerPreferences,
  Trip
} from '@/src/types/models';

const TRIP_ID = 'portugal-2026';
let database: Promise<SQLite.SQLiteDatabase> | undefined;
let hasLegacyPayloadColumn = false;
let operationQueue: Promise<void> = Promise.resolve();

// Expo shares this connection across async calls. Serialize reads too, so a
// legacy multi-query load cannot observe a partially rewritten aggregate.
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

const json = (value: unknown) => JSON.stringify(value ?? null);
const parse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};
const bool = (value: number | null | undefined) => value === 1;

function parseTripSnapshot(value: string | null | undefined): Trip | null {
  const trip = parse<Trip | null>(value, null);
  if (!trip || typeof trip.id !== 'string' || typeof trip.title !== 'string'
    || !Array.isArray(trip.cities) || !Array.isArray(trip.costs)
    || !trip.cities.every(city => city && Array.isArray(city.days)
      && city.days.every(day => day && Array.isArray(day.segments)))) {
    return null;
  }
  return trip;
}

function normalizeLegacyTrip(trip: Trip): Trip {
  const normalizeSyncStatus = (status: SyncStatus): SyncStatus =>
    String(status) === 'local' ? 'local-only' : status;
  return {
    ...trip,
    syncStatus: normalizeSyncStatus(trip.syncStatus),
    cities: trip.cities.map(city => ({
      ...city,
      days: city.days.map(day => ({
        ...day,
        segments: day.segments.map(segment => ({
          ...segment,
          syncStatus: normalizeSyncStatus(segment.syncStatus)
        }))
      }))
    })),
    costs: trip.costs.map(entry => ({
      ...entry,
      syncStatus: normalizeSyncStatus(entry.syncStatus)
    }))
  };
}

async function addMissingColumns(
  db: SQLite.SQLiteDatabase,
  table: 'trips' | 'places' | 'cities' | 'itinerary_days' | 'itinerary_segments',
  columns: ReadonlyArray<readonly [string, string]>
) {
  const existing = new Set((await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`
  )).map(column => column.name));
  for (const [name, definition] of columns) {
    if (!existing.has(name)) {
      // Identifiers and definitions come only from the static schema constants.
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition};`);
    }
  }
}

async function insertPlace(
  db: SQLite.SQLiteDatabase,
  place: Place,
  cityId: string,
  validationStatus?: string
) {
  await db.runAsync(
    `INSERT INTO places (
      id, city_id, name, neighborhood, type_json, description, google_maps_url,
      website_url, notes, recommended_dishes_json, dietary_notes_json,
      validation_status, google_place_id, rating, review_count, popular_dishes_json,
      review_topics_json, review_validation, review_summary, review_source,
      photo_url, photo_attribution, photo_reference, open_now, last_fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      city_id = excluded.city_id,
      name = excluded.name,
      neighborhood = excluded.neighborhood,
      type_json = excluded.type_json,
      description = excluded.description,
      google_maps_url = excluded.google_maps_url,
      website_url = excluded.website_url,
      recommended_dishes_json = excluded.recommended_dishes_json,
      dietary_notes_json = excluded.dietary_notes_json,
      validation_status = excluded.validation_status,
      google_place_id = excluded.google_place_id,
      rating = excluded.rating,
      review_count = excluded.review_count,
      popular_dishes_json = excluded.popular_dishes_json,
      review_topics_json = excluded.review_topics_json,
      review_validation = excluded.review_validation,
      review_summary = excluded.review_summary,
      review_source = excluded.review_source,
      photo_url = excluded.photo_url,
      photo_attribution = excluded.photo_attribution,
      photo_reference = excluded.photo_reference,
      open_now = excluded.open_now,
      last_fetched_at = excluded.last_fetched_at`,
    place.id,
    cityId,
    place.name,
    place.neighborhood ?? null,
    json([place.category]),
    place.description ?? null,
    place.googleMapsUrl ?? null,
    place.websiteUrl ?? null,
    null,
    json(place.recommendedDishes ?? []),
    json(place.dietaryNotes ? [place.dietaryNotes] : []),
    validationStatus ?? null,
    place.metadata?.googlePlaceId ?? null,
    place.metadata?.rating ?? null,
    place.metadata?.reviewCount ?? null,
    json(place.metadata?.popularDishes ?? []),
    json(place.metadata?.reviewTopics ?? []),
    place.metadata?.reviewValidation ?? null,
    place.metadata?.reviewSummary ?? null,
    place.metadata?.source ?? null,
    place.metadata?.photoUrl ?? null,
    place.metadata?.photoAttribution ?? null,
    place.metadata?.photoReference ?? null,
    place.metadata?.openNow === undefined ? null : Number(place.metadata.openNow),
    place.metadata?.fetchedAt ?? null
  );
}

async function writeTripToDatabase(db: SQLite.SQLiteDatabase, trip: Trip, snapshot: string) {
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // Upsert the parent to preserve created_at and any legacy payload/columns.
    await db.runAsync(
      `INSERT INTO trips (
        id, title, country, active_city_id, start_date, end_date, nights,
        hotel_base, preferences_json, sync_status, created_at, updated_at
        ${hasLegacyPayloadColumn ? ', payload' : ''}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasLegacyPayloadColumn ? ', ?' : ''})
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        country = excluded.country,
        active_city_id = excluded.active_city_id,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        nights = excluded.nights,
        hotel_base = excluded.hotel_base,
        preferences_json = excluded.preferences_json,
        sync_status = excluded.sync_status,
        updated_at = excluded.updated_at`,
      trip.id,
      trip.title,
      trip.cities[0]?.country ?? 'Portugal',
      trip.activeCityId,
      trip.startDate,
      trip.endDate,
      trip.nights,
      trip.hotelBase,
      json(trip.preferences),
      trip.syncStatus,
      trip.updatedAt,
      trip.updatedAt,
      ...(hasLegacyPayloadColumn ? [snapshot] : [])
    );
    await db.runAsync('DELETE FROM cost_entries WHERE trip_id = ?', trip.id);
    const { cities: _cities, costs: _costs, ...tripExtensions } = trip;
    await db.runAsync('UPDATE trips SET countries_json = ?, extensions_json = ? WHERE id = ?', json(trip.countries ?? []), json(tripExtensions), trip.id);
    await db.runAsync('DELETE FROM cities WHERE trip_id = ?', trip.id);

    const persistedDayIds = new Set<string>();
    const persistedSegmentIds = new Set<string>();

    for (const [cityIndex, city] of trip.cities.entries()) {
      await db.runAsync(
        `INSERT INTO cities (
          id, trip_id, city, country, start_date, end_date, nights,
          timezone, status, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        city.id,
        trip.id,
        city.city,
        city.country,
        city.startDate ?? null,
        city.endDate ?? null,
        city.nights ?? null,
        city.timezone ?? null,
        city.status,
        cityIndex
      );

      for (const [dayIndex, day] of city.days.entries()) {
        persistedDayIds.add(day.id);
        await db.runAsync(
          `INSERT INTO itinerary_days (
            id, city_id, date, title, theme, summary, order_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          day.id,
          city.id,
          day.date,
          day.title,
          day.theme,
          day.summary,
          dayIndex
        );

        for (const segment of day.segments) {
          persistedSegmentIds.add(segment.id);
          const place: Place = {
            id: segment.placeId,
            name: segment.title,
            city: city.city,
            category: segment.category,
            description: segment.description,
            recommendedDishes: segment.recommendedDishes,
            dietaryNotes: segment.dietaryNotes,
            googleMapsUrl: segment.googleMapsUrl,
            websiteUrl: segment.websiteUrl,
            metadata: segment.googlePlaceMetadata
          };
          await insertPlace(db, place, city.id, segment.validationStatus);
          await db.runAsync(
            `INSERT INTO itinerary_segments (
              id, day_id, place_id, time_block, category, title, description,
              order_index, is_locked, is_completed, recommended_dishes_json,
              dietary_notes_json, reservation_recommended, booking_note,
              google_maps_url, website_url, transport_from_previous, priority,
              validation_status, estimated_cost, actual_cost, currency, user_notes,
              is_backup, sync_status, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            segment.id,
            day.id,
            segment.placeId,
            segment.timeBlock,
            segment.category,
            segment.title,
            segment.description,
            segment.orderIndex,
            Number(segment.isLocked),
            Number(segment.isCompleted),
            json(segment.recommendedDishes),
            json(segment.dietaryNotes ? [segment.dietaryNotes] : []),
            Number(segment.reservationRecommended),
            segment.bookingNote ?? null,
            segment.googleMapsUrl,
            segment.websiteUrl ?? null,
            segment.transportFromPrevious ?? null,
            segment.priority,
            segment.validationStatus,
            segment.estimatedCost,
            segment.actualCost ?? null,
            segment.currency,
            segment.userNotes,
            Number(segment.isBackup ?? false),
            segment.syncStatus,
            segment.updatedAt
          );

          for (const [rank, alternative] of segment.alternatives.entries()) {
            await insertPlace(db, alternative, city.id);
            await db.runAsync(
              `INSERT INTO alternatives (
                id, segment_id, place_id, reason, rank, source, vibe,
                estimated_cost, distance_label, dietary_suitable
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              `${segment.id}:${alternative.id}`,
              segment.id,
              alternative.id,
              alternative.description ?? null,
              rank,
              alternative.curated ? 'curated' : 'google-places',
              alternative.vibe ?? null,
              alternative.estimatedCost ?? null,
              alternative.distanceLabel ?? null,
              alternative.dietarySuitable === undefined ? null : Number(alternative.dietarySuitable)
            );
          }
          await db.runAsync('UPDATE itinerary_segments SET route_json = ?, extensions_json = ? WHERE id = ?', json(segment.routeFromPrevious), json(segment), segment.id);
        }
        const { segments: _segments, ...dayExtensions } = day;
        await db.runAsync('UPDATE itinerary_days SET stay_id = ?, extensions_json = ? WHERE id = ?', day.stayId ?? null, json(dayExtensions), day.id);
      }
      const { days: _days, ...cityExtensions } = city;
      await db.runAsync('UPDATE cities SET stays_json = ?, transport_bookings_json = ?, extensions_json = ? WHERE id = ?', json(city.stays ?? []), json(city.transportBookings ?? []), json(cityExtensions), city.id);
    }

    for (const entry of trip.costs) {
      await db.runAsync(
        `INSERT INTO cost_entries (
          id, trip_id, segment_id, day_id, title, amount, estimated_amount,
          currency, category, note, sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.id,
        trip.id,
        // Archived/deleted itinerary items have no active SQL row. Preserve
        // their original associations in the snapshot without violating FKs.
        entry.segmentId && persistedSegmentIds.has(entry.segmentId) ? entry.segmentId : null,
        persistedDayIds.has(entry.dayId) ? entry.dayId : null,
        entry.title,
        entry.actualCost ?? 0,
        entry.estimatedCost,
        entry.currency,
        entry.category,
        null,
        entry.syncStatus,
        entry.updatedAt,
        entry.updatedAt
      );
    }

    await db.runAsync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      TRIP_SNAPSHOT_KEY,
      snapshot
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;').catch(() => undefined);
    throw error;
  }
}

async function getDatabase() {
  if (!database) {
    database = SQLite.openDatabaseAsync('portugal-companion.db').then(async db => {
      let transactionStarted = false;
      try {
        // WAL and foreign_keys must be configured outside a transaction.
        await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
        await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
        transactionStarted = true;
        const tripColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(trips)');
        hasLegacyPayloadColumn = tripColumns.some(column => column.name === 'payload');
        if (hasLegacyPayloadColumn) {
          await addMissingColumns(db, 'trips', legacyTripColumns);
        }

        // CREATE IF NOT EXISTS + ALTER ADD COLUMN only: normalized v2-v4 rows
        // and even unparseable/other-trip v1 payloads are never discarded.
        await db.execAsync(schema);
        await addMissingColumns(db, 'places', placeMetadataColumns);
        for (const table of Object.keys(mallorcaColumns) as Array<keyof typeof mallorcaColumns>) {
          await addMissingColumns(db, table, mallorcaColumns[table]);
        }
        const versionRow = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM app_meta WHERE key = 'database_version'`
        );

        if (hasLegacyPayloadColumn) {
          const row = await db.getFirstAsync<{ payload: string; title: string }>(
            'SELECT payload, title FROM trips WHERE id = ?',
            TRIP_ID
          );
          const legacyTrip = row && !row.title ? parseTripSnapshot(row.payload) : null;
          if (legacyTrip) {
            // Import only the snapshot. Leave all legacy rows and raw payloads
            // intact; the next explicit save will refresh normalized tables.
            await db.runAsync(
              'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
              TRIP_SNAPSHOT_KEY,
              json(normalizeLegacyTrip(legacyTrip))
            );
          }
        }

        const version = Number(versionRow?.value ?? 0);
        if (!Number.isFinite(version) || version < DATABASE_VERSION) {
          // Advance only after all migration work succeeds; never downgrade a
          // version written by a newer application.
          await db.runAsync(
            `INSERT INTO app_meta (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            'database_version',
            String(DATABASE_VERSION)
          );
        }
        await db.execAsync('COMMIT;');
        return db;
      } catch (error) {
        if (transactionStarted) await db.execAsync('ROLLBACK;').catch(() => undefined);
        await db.closeAsync().catch(() => undefined);
        throw error;
      }
    }).catch(error => {
      // A transient open/migration failure must not poison all later saves.
      database = undefined;
      throw error;
    });
  }
  return database;
}

async function loadTripFromDatabase(db: SQLite.SQLiteDatabase): Promise<Trip | null> {
    const snapshotRow = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      TRIP_SNAPSHOT_KEY
    );
    const snapshot = parseTripSnapshot(snapshotRow?.value);
    if (snapshot) return snapshot;

    // Missing/corrupt snapshots fall back to the original SQL reader.
    const tripRow = await db.getFirstAsync<{
      extensions_json?: string;
      id: string;
      title: string;
      active_city_id: string;
      start_date: string;
      end_date: string;
      nights: number;
      hotel_base: string;
      preferences_json: string;
      sync_status: SyncStatus;
      updated_at: string;
      payload?: string;
    }>('SELECT * FROM trips WHERE id = ?', TRIP_ID);
    if (!tripRow) return null;
    if (hasLegacyPayloadColumn && !tripRow.title) {
      const legacyTrip = parseTripSnapshot(tripRow.payload);
      return legacyTrip ? normalizeLegacyTrip(legacyTrip) : null;
    }

    const cityRows = await db.getAllAsync<{
      extensions_json?: string;
      id: string;
      city: string;
      country: string;
      start_date: string | null;
      end_date: string | null;
      nights: number | null;
      timezone: string | null;
      status: CityPlan['status'];
    }>('SELECT * FROM cities WHERE trip_id = ? ORDER BY order_index', tripRow.id);
    const dayRows = await db.getAllAsync<{
      extensions_json?: string;
      id: string;
      city_id: string;
      date: string;
      title: string;
      theme: string;
      summary: string;
    }>(`SELECT d.* FROM itinerary_days d
       JOIN cities c ON c.id = d.city_id
       WHERE c.trip_id = ? ORDER BY c.order_index, d.order_index`, tripRow.id);
    const segmentRows = await db.getAllAsync<{
      extensions_json?: string;
      id: string;
      day_id: string;
      place_id: string;
      time_block: string;
      category: string;
      title: string;
      description: string;
      order_index: number;
      is_locked: number;
      is_completed: number;
      recommended_dishes_json: string;
      dietary_notes_json: string;
      reservation_recommended: number;
      booking_note: string | null;
      google_maps_url: string;
      website_url: string | null;
      transport_from_previous: string | null;
      priority: ItinerarySegment['priority'];
      validation_status: ItinerarySegment['validationStatus'];
      estimated_cost: number;
      actual_cost: number | null;
      currency: ItinerarySegment['currency'];
      user_notes: string;
      is_backup: number;
      sync_status: SyncStatus;
      updated_at: string;
    }>(`SELECT s.* FROM itinerary_segments s
       JOIN itinerary_days d ON d.id = s.day_id
       JOIN cities c ON c.id = d.city_id
       WHERE c.trip_id = ? ORDER BY c.order_index, d.order_index, s.order_index`, tripRow.id);
    const placeRows = await db.getAllAsync<{
      id: string;
      city_id: string;
      name: string;
      neighborhood: string | null;
      type_json: string;
      description: string | null;
      google_maps_url: string | null;
      website_url: string | null;
      recommended_dishes_json: string;
      dietary_notes_json: string;
      google_place_id: string | null;
      rating: number | null;
      review_count: number | null;
      popular_dishes_json: string;
      review_topics_json: string;
      review_validation: 'strong' | 'good' | 'mixed' | null;
      review_summary: string | null;
      review_source: 'google-maps' | null;
      photo_url: string | null;
      photo_attribution: string | null;
      photo_reference: string | null;
      open_now: number | null;
      last_fetched_at: string | null;
    }>(`SELECT p.* FROM places p
       JOIN cities c ON c.id = p.city_id
       WHERE c.trip_id = ?`, tripRow.id);
    const alternativeRows = await db.getAllAsync<{
      segment_id: string;
      place_id: string;
      reason: string | null;
      source: string;
      vibe: string | null;
      estimated_cost: number | null;
      distance_label: string | null;
      dietary_suitable: number | null;
    }>(`SELECT a.* FROM alternatives a
       JOIN itinerary_segments s ON s.id = a.segment_id
       JOIN itinerary_days d ON d.id = s.day_id
       JOIN cities c ON c.id = d.city_id
       WHERE c.trip_id = ? ORDER BY a.segment_id, a.rank`, tripRow.id);

    const cityNameById = new Map(cityRows.map(city => [city.id, city.city]));
    const placeById = new Map(placeRows.map(place => {
      const types = parse<string[]>(place.type_json, []);
      const dietaryNotes = parse<string[]>(place.dietary_notes_json, []);
      return [place.id, {
        id: place.id,
        name: place.name,
        city: cityNameById.get(place.city_id) ?? '',
        category: types[0] ?? 'place',
        neighborhood: place.neighborhood ?? undefined,
        description: place.description ?? undefined,
        recommendedDishes: parse<string[]>(place.recommended_dishes_json, []),
        dietaryNotes: dietaryNotes[0],
        googleMapsUrl: place.google_maps_url ?? undefined,
        websiteUrl: place.website_url ?? undefined,
        metadata: {
          googlePlaceId: place.google_place_id ?? undefined,
          rating: place.rating ?? undefined,
          reviewCount: place.review_count ?? undefined,
          popularDishes: parse<string[]>(place.popular_dishes_json, []),
          reviewTopics: parse<string[]>(place.review_topics_json, []),
          reviewValidation: place.review_validation ?? undefined,
          reviewSummary: place.review_summary ?? undefined,
          source: place.review_source ?? undefined,
          photoUrl: place.photo_url ?? undefined,
          photoAttribution: place.photo_attribution ?? undefined,
          photoReference: place.photo_reference ?? undefined,
          openNow: place.open_now === null ? undefined : bool(place.open_now),
          fetchedAt: place.last_fetched_at ?? undefined
        }
      } satisfies Place] as const;
    }));
    const alternativesBySegment = new Map<string, AlternativePlace[]>();
    for (const row of alternativeRows) {
      const place = placeById.get(row.place_id);
      if (!place) continue;
      const list = alternativesBySegment.get(row.segment_id) ?? [];
      list.push({
        ...place,
        description: row.reason ?? place.description,
        curated: row.source === 'curated',
        vibe: row.vibe ?? undefined,
        estimatedCost: row.estimated_cost ?? undefined,
        distanceLabel: row.distance_label ?? undefined,
        dietarySuitable: row.dietary_suitable === null ? undefined : bool(row.dietary_suitable)
      });
      alternativesBySegment.set(row.segment_id, list);
    }

    const segmentsByDay = new Map<string, ItinerarySegment[]>();
    for (const row of segmentRows) {
      const dietaryNotes = parse<string[]>(row.dietary_notes_json, []);
      const segment: ItinerarySegment = {
        id: row.id,
        date: dayRows.find(day => day.id === row.day_id)?.date ?? tripRow.start_date,
        timeBlock: row.time_block,
        category: row.category,
        title: row.title,
        description: row.description,
        placeId: row.place_id,
        orderIndex: row.order_index,
        isLocked: bool(row.is_locked),
        isCompleted: bool(row.is_completed),
        recommendedDishes: parse<string[]>(row.recommended_dishes_json, []),
        dietaryNotes: dietaryNotes[0],
        reservationRecommended: bool(row.reservation_recommended),
        bookingNote: row.booking_note ?? undefined,
        googleMapsUrl: row.google_maps_url,
        websiteUrl: row.website_url ?? undefined,
        transportFromPrevious: row.transport_from_previous ?? undefined,
        priority: row.priority,
        validationStatus: row.validation_status,
        googlePlaceMetadata: placeById.get(row.place_id)?.metadata,
        estimatedCost: row.estimated_cost,
        actualCost: row.actual_cost ?? undefined,
        currency: row.currency,
        userNotes: row.user_notes,
        alternatives: alternativesBySegment.get(row.id) ?? [],
        syncStatus: row.sync_status,
        updatedAt: row.updated_at,
        isBackup: bool(row.is_backup)
      };
      const list = segmentsByDay.get(row.day_id) ?? [];
      list.push(segment);
      segmentsByDay.set(row.day_id, list);
    }

    const daysByCity = new Map<string, ItineraryDay[]>();
    for (const row of dayRows) {
      const list = daysByCity.get(row.city_id) ?? [];
      list.push({
        id: row.id,
        date: row.date,
        title: row.title,
        theme: row.theme,
        summary: row.summary,
        ...parse<Partial<ItineraryDay>>(row.extensions_json, {}),
        segments: (segmentsByDay.get(row.id) ?? []).map(segment => {
          const stored = parse<Partial<ItinerarySegment>>(segmentRows.find(s => s.id === segment.id)?.extensions_json, {});
          return stored.id === segment.id && Array.isArray(stored.alternatives) ? stored as ItinerarySegment : segment;
        })
      });
      daysByCity.set(row.city_id, list);
    }

    const costRows = await db.getAllAsync<{
      id: string;
      segment_id: string | null;
      day_id: string;
      title: string;
      category: CostEntry['category'];
      amount: number;
      estimated_amount: number;
      currency: CostEntry['currency'];
      sync_status: SyncStatus;
      updated_at: string;
    }>('SELECT * FROM cost_entries WHERE trip_id = ? ORDER BY created_at', tripRow.id);

    return {
      ...parse<Partial<Trip>>(tripRow.extensions_json, {}),
      id: tripRow.id,
      title: tripRow.title,
      activeCityId: tripRow.active_city_id,
      startDate: tripRow.start_date,
      endDate: tripRow.end_date,
      nights: tripRow.nights,
      hotelBase: tripRow.hotel_base,
      preferences: parse<TravelerPreferences>(tripRow.preferences_json, {
        noPork: true,
        seafoodOkay: true,
        tripStyle: [],
        transport: [],
        diningPace: ''
      }),
      cities: cityRows.map(city => ({
        id: city.id,
        city: city.city,
        country: city.country,
        status: city.status,
        startDate: city.start_date ?? undefined,
        endDate: city.end_date ?? undefined,
        nights: city.nights ?? undefined,
        timezone: city.timezone ?? undefined,
        stays: [],
        ...parse<Partial<CityPlan>>(city.extensions_json, {}),
        days: daysByCity.get(city.id) ?? []
      })),
      costs: costRows.map(row => ({
        id: row.id,
        segmentId: row.segment_id ?? undefined,
        dayId: row.day_id,
        title: row.title,
        category: row.category,
        estimatedCost: row.estimated_amount,
        actualCost: row.amount || undefined,
        currency: row.currency,
        syncStatus: row.sync_status,
        updatedAt: row.updated_at
      })),
      syncStatus: tripRow.sync_status,
      updatedAt: tripRow.updated_at
    };
}

export const tripRepository: TripRepository = {
  loadTrip() {
    return enqueue(async () => loadTripFromDatabase(await getDatabase()));
  },
  async saveTrip(trip) {
    // Capture before waiting: callers can mutate their object while earlier
    // keystroke saves are still queued. Both representations use this capture.
    const snapshot = json(trip);
    const capturedTrip = JSON.parse(snapshot) as Trip;
    await enqueue(async () => {
      const db = await getDatabase();
      await writeTripToDatabase(db, capturedTrip, snapshot);
    });
  }
};
