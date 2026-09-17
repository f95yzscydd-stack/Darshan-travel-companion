export const DATABASE_VERSION = 6;

// The full aggregate is authoritative; normalized tables remain queryable and
// provide the fallback for installations that predate snapshots.
export const TRIP_SNAPSHOT_KEY = 'trip_snapshot_v5';

// Retain the snapshot key so v5 installations are read before being upgraded.
// New columns are added transactionally; legacy columns and rows are retained.
export const mallorcaColumns = {
  trips: [['countries_json', "TEXT NOT NULL DEFAULT '[]'"], ['extensions_json', "TEXT NOT NULL DEFAULT '{}'"]],
  cities: [['stays_json', "TEXT NOT NULL DEFAULT '[]'"], ['transport_bookings_json', "TEXT NOT NULL DEFAULT '[]'"], ['extensions_json', "TEXT NOT NULL DEFAULT '{}'"]],
  itinerary_days: [['stay_id', 'TEXT'], ['extensions_json', "TEXT NOT NULL DEFAULT '{}'"]],
  itinerary_segments: [['route_json', 'TEXT'], ['extensions_json', "TEXT NOT NULL DEFAULT '{}'"]]
} as const;

// Version 1 stored JSON in trips.payload. Extend that table in place, keeping
// every original row/column (including payload), instead of dropping it.
export const legacyTripColumns: ReadonlyArray<readonly [string, string]> = [
  ['title', "TEXT NOT NULL DEFAULT ''"],
  ['country', 'TEXT'],
  ['active_city_id', 'TEXT'],
  ['start_date', 'TEXT'],
  ['end_date', 'TEXT'],
  ['nights', 'INTEGER'],
  ['hotel_base', 'TEXT'],
  ['preferences_json', "TEXT NOT NULL DEFAULT '{}'"],
  ['sync_status', "TEXT NOT NULL DEFAULT 'local-only'"],
  ['created_at', 'TEXT'],
  ['updated_at', 'TEXT']
];

export const placeMetadataColumns: ReadonlyArray<readonly [string, string]> = [
  ['google_place_id', 'TEXT'],
  ['rating', 'REAL'],
  ['review_count', 'INTEGER'],
  ['popular_dishes_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['review_topics_json', "TEXT NOT NULL DEFAULT '[]'"],
  ['review_validation', 'TEXT'],
  ['review_summary', 'TEXT'],
  ['review_source', 'TEXT'],
  ['photo_url', 'TEXT'],
  ['photo_attribution', 'TEXT'],
  ['photo_reference', 'TEXT'],
  ['open_now', 'INTEGER'],
  ['last_fetched_at', 'TEXT']
];

export const schema = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  country TEXT,
  active_city_id TEXT,
  start_date TEXT,
  end_date TEXT,
  nights INTEGER,
  hotel_base TEXT,
  preferences_json TEXT NOT NULL DEFAULT '{}',
  sync_status TEXT NOT NULL DEFAULT 'local-only',
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT,
  start_date TEXT,
  end_date TEXT,
  nights INTEGER,
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY NOT NULL,
  city_id TEXT,
  name TEXT NOT NULL,
  neighborhood TEXT,
  type_json TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  google_maps_url TEXT,
  website_url TEXT,
  notes TEXT,
  recommended_dishes_json TEXT NOT NULL DEFAULT '[]',
  dietary_notes_json TEXT NOT NULL DEFAULT '[]',
  validation_status TEXT,
  google_place_id TEXT,
  rating REAL,
  review_count INTEGER,
  popular_dishes_json TEXT NOT NULL DEFAULT '[]',
  review_topics_json TEXT NOT NULL DEFAULT '[]',
  review_validation TEXT,
  review_summary TEXT,
  review_source TEXT,
  photo_url TEXT,
  photo_attribution TEXT,
  photo_reference TEXT,
  open_now INTEGER,
  last_fetched_at TEXT,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itinerary_days (
  id TEXT PRIMARY KEY NOT NULL,
  city_id TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT,
  theme TEXT,
  summary TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itinerary_segments (
  id TEXT PRIMARY KEY NOT NULL,
  day_id TEXT NOT NULL,
  place_id TEXT,
  time_block TEXT,
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER NOT NULL DEFAULT 0,
  recommended_dishes_json TEXT NOT NULL DEFAULT '[]',
  dietary_notes_json TEXT NOT NULL DEFAULT '[]',
  reservation_recommended INTEGER NOT NULL DEFAULT 0,
  booking_note TEXT,
  google_maps_url TEXT,
  website_url TEXT,
  transport_from_previous TEXT,
  priority TEXT,
  validation_status TEXT,
  estimated_cost REAL NOT NULL DEFAULT 0,
  actual_cost REAL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  user_notes TEXT NOT NULL DEFAULT '',
  is_backup INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'local-only',
  updated_at TEXT,
  FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS alternatives (
  id TEXT PRIMARY KEY NOT NULL,
  segment_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  reason TEXT,
  rank INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'curated',
  vibe TEXT,
  estimated_cost REAL,
  distance_label TEXT,
  dietary_suitable INTEGER,
  FOREIGN KEY (segment_id) REFERENCES itinerary_segments(id) ON DELETE CASCADE,
  FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cost_entries (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL,
  segment_id TEXT,
  day_id TEXT,
  title TEXT,
  amount REAL NOT NULL,
  estimated_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT,
  note TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local-only',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (segment_id) REFERENCES itinerary_segments(id) ON DELETE SET NULL,
  FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cities_trip_order ON cities(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_days_city_order ON itinerary_days(city_id, order_index);
CREATE INDEX IF NOT EXISTS idx_segments_day_order ON itinerary_segments(day_id, order_index);
CREATE INDEX IF NOT EXISTS idx_alternatives_segment_rank ON alternatives(segment_id, rank);
CREATE INDEX IF NOT EXISTS idx_cost_entries_trip ON cost_entries(trip_id);
`;
