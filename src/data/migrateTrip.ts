import { seedTrip } from './seed';
import { normalizeMetadata } from '@/src/utils/placeMetadata';
import { rebaseTripRoutes } from '@/src/utils/routes';
import { ItinerarySegment, Trip } from '@/src/types/models';
import { appendMallorca } from './mallorca';

export const PLAN_VERSION = 7;
const removed = (segment: ItinerarySegment) => /the vintage|v rooftop|eurostars|exmo hotel|pestana douro/i.test(segment.title);
const replacements: Record<string, string> = {
  'hotel-arrival': 'lisbon-airbnb-arrival',
  'porto-hotel-eurostars-douro': 'porto-airbnb-checkin',
  'frangasqueira': 'bonjardim'
};
const revised = new Set(['dear-breakfast', 'train-sintra', 'pena', 'regaleira', 'bacalhau-vila', 'piriquita', 'sintra-return-train', 'lisbon-airbnb-reset-sintra', 'seen', 'porto-roadtrip-checkout', 'porto-rental-pickup', 'roadtrip-obidos', 'roadtrip-pangeia-nazare', 'roadtrip-nazare-sitio', 'porto-rental-return', 'porto-airbnb-checkin', 'porto-breakfast-box', 'porto-airport-ride', 'porto-airport-security', 'porto-palma-flight']);

const personalFields = (prior: ItinerarySegment) => ({
  actualCost: prior.actualCost, userNotes: prior.userNotes, isCompleted: prior.isCompleted,
  ...(prior.actualCost !== undefined ? { currency: prior.currency } : {}),
  syncStatus: prior.syncStatus, updatedAt: prior.updatedAt
});

const updatePlannedStop = (plan: ItinerarySegment, prior: ItinerarySegment): ItinerarySegment => ({
  ...plan, ...personalFields(prior),
  googlePlaceMetadata: prior.title === plan.title ? normalizeMetadata(prior.googlePlaceMetadata) ?? plan.googlePlaceMetadata : plan.googlePlaceMetadata,
  alternatives: [...new Map([...prior.alternatives, ...plan.alternatives].map(alt => [alt.id, alt])).values()]
    .filter(alt => alt.name !== plan.title)
});

/** Run a plan migration once. Subsequent loads retain deletions, swaps and order. */
function migratePortugal(saved: Trip | null): Trip {
  if (!saved) return rebaseTripRoutes({ ...seedTrip, schemaVersion: 6 });
  const legacy = (saved.schemaVersion ?? 0) < 6;
  const archived = [...(saved.archivedSegments ?? [])];
  const cities = seedTrip.cities.map(city => {
    const priorCity = saved.cities.find(item => item.id === city.id);
    return {
      ...(priorCity ?? city),
      homeBase: city.homeBase,
      nearbyPlaces: city.nearbyPlaces,
      days: city.days.map(day => {
        const priorDay = priorCity?.days.find(item => item.id === day.id);
        if (!priorDay) return day;
        const latest = new Map(day.segments.map(segment => [segment.id, segment]));
        const migrated = priorDay.segments.flatMap<ItinerarySegment>(prior => {
          const replacementId = replacements[prior.id];
          const plan = latest.get(replacementId ?? prior.id);
          if (removed(prior) || prior.id === 'frangasqueira' || prior.id === 'porto-lello' || prior.isBackup || prior.status === 'backup') {
            if (!archived.some(item => item.id === prior.id)) archived.push({ ...prior, status: 'archived' });
            return plan && (replacementId || revised.has(prior.id)) ? [updatePlannedStop(plan, prior)] : [];
          }
          if (legacy && plan && revised.has(prior.id)) return [updatePlannedStop(plan, prior)];
          return [{ ...prior, address: prior.address ?? (prior.title === plan?.title ? plan?.address : undefined),
            routeMode: prior.routeMode ?? (prior.title === plan?.title ? plan?.routeMode : undefined),
            routeOriginOverride: prior.routeOriginOverride ?? plan?.routeOriginOverride }];
        });
        // Only add the newly requested stops and locked logistics on this migration.
        // Missing ordinary stops may have been deliberately deleted by the traveler.
        if (legacy) {
          const newIds = new Set(['chiado-walk', 'lisbon-airbnb-arrival', 'porto-airbnb-checkin', 'porto-roadtrip-checkout', 'bonjardim', 'gaia-dom-luis-bridge', 'roadtrip-refuel', 'porto-airport-shuttle', 'sintra-return-train', 'lisbon-airbnb-reset-sintra', 'lisbon-airbnb-return-day-1', 'lisbon-airbnb-return-day-2', 'lisbon-airbnb-return-day-3', 'porto-airbnb-return-day-2', 'porto-preflight-prep']);
          for (const plan of day.segments) {
            if (!newIds.has(plan.id) || migrated.some(item => item.id === plan.id)) continue;
            const index = day.segments.indexOf(plan);
            const nextId = day.segments.slice(index + 1).find(item => migrated.some(prior => prior.id === item.id))?.id;
            const insertion = nextId ? migrated.findIndex(item => item.id === nextId) : migrated.length;
            migrated.splice(insertion, 0, plan);
          }
        }
        return { ...(legacy ? day : priorDay), backups: [
          ...(day.backups ?? []), ...(priorDay.backups ?? []).filter(item => !(day.backups ?? []).some(backup => backup.id === item.id))
        ], segments: migrated.map((segment, orderIndex) => ({
          ...segment, orderIndex, googlePlaceMetadata: normalizeMetadata(segment.googlePlaceMetadata),
          alternatives: segment.alternatives.filter(alt => !/the vintage|v rooftop|eurostars|exmo hotel|pestana douro/i.test(alt.name))
            .map(alt => ({ ...alt, metadata: normalizeMetadata(alt.metadata) }))
        })) };
      })
    };
  });
  return rebaseTripRoutes({ ...saved, schemaVersion: 6, hotelBase: seedTrip.hotelBase,
    carRental: seedTrip.carRental, cities, archivedSegments: archived,
    placeMetadataCache: Object.fromEntries(Object.entries(saved.placeMetadataCache ?? {}).map(([key, value]) => [key, normalizeMetadata(value)!]))
  });
}

export function migrateTrip(saved: Trip | null): Trip {
  // Version-6 Portugal records are already migrated. Never replay older plan
  // replacements or drop cities, custom stops, costs, edits or deletions.
  const base = saved && (saved.schemaVersion ?? 0) >= 6 ? saved : migratePortugal(saved);
  const expanded = appendMallorca(base);
  return { ...expanded, cities: expanded.cities.map(city => city.id === 'mallorca-2026'
    ? rebaseTripRoutes({ ...expanded, cities: [city] }).cities[0] : city) };
}
