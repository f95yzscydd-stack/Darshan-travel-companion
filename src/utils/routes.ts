import { seedTrip } from '@/src/data/seed';
import { mallorcaPlan } from '@/src/data/mallorca';
import { CityPlan, ItineraryDay, ItinerarySegment, RouteLeg, RouteMode, Trip } from '@/src/types/models';
import { googleMapsDirectionsUrl } from './maps';

export const isActiveStop = (segment: ItinerarySegment) => !segment.isBackup && segment.status !== 'backup' && segment.status !== 'archived';

export function destinationFor(segment: ItinerarySegment, city: CityPlan): string {
  if (segment.address) return segment.address;
  // Maps search queries retain the actual branch/city when a stop is replaced.
  try {
    const query = new URL(segment.googleMapsUrl).searchParams.get('query');
    if (query && query !== `${segment.title}, Portugal`) return query;
  } catch { /* A custom stop can be edited before its Maps link is valid. */ }
  const location = /sintra|pena|regaleira|bacalhau-vila|piriquita/.test(segment.id) ? 'Sintra' : city.city;
  return `${segment.title}, ${location}, ${city.country}`;
}

export function legEndpoints(city: CityPlan, day: ItineraryDay, segment: ItinerarySegment, mode?: RouteMode) {
  const active = day.segments.filter(isActiveStop);
  const index = active.findIndex(item => item.id === segment.id);
  const previous = active[index - 1];
  // Overrides only apply at the start of a day (arrival airport / intercity departure).
  const stay = city.stays?.find(stay => stay.id === (day.startStayId ?? day.stayId));
  const origin = previous ? destinationFor(previous, city) : segment.routeOriginOverride ?? stay?.address ?? city.homeBase?.address ?? city.city;
  const destination = destinationFor(segment, city);
  return { origin, destination, mode: mode ?? segment.routeMode ?? 'walking' as RouteMode };
}

export const routeKey = (leg: Pick<RouteLeg, 'origin' | 'destination' | 'mode'>) => JSON.stringify([leg.origin, leg.destination, leg.mode]);

// Seed allowances describe the exact approved leg. They are never reused for
// different endpoints or modes after edits; live route data can replace them.
export function buildRouteLeg(city: CityPlan, day: ItineraryDay, segment: ItinerarySegment, mode?: RouteMode): RouteLeg {
  const endpoints = legEndpoints(city, day, segment, mode);
  const directionsUrl = segment.routeKind === 'boat' ? segment.websiteUrl ?? segment.googleMapsUrl
    : segment.routeKind === 'flight' ? segment.googleMapsUrl
    : googleMapsDirectionsUrl(endpoints.origin, endpoints.destination, endpoints.mode);
  const old = segment.routeFromPrevious;
  if (old?.source === 'google-routes' && routeKey(old) === routeKey(endpoints)) return {
    ...old, directionsUrl, status: old.lastUpdated && Date.now() - Date.parse(old.lastUpdated) < 15 * 60 * 1000 ? 'live' : 'stale'
  };
  const baselineCity = [...seedTrip.cities, mallorcaPlan].find(item => item.id === city.id);
  const baselineDay = baselineCity?.days.find(item => item.id === day.id);
  const baseline = baselineDay?.segments.find(item => item.id === segment.id);
  const unchanged = baselineCity && baselineDay && baseline && routeKey(legEndpoints(baselineCity, baselineDay, baseline)) === routeKey(endpoints);
  const backup = baselineDay?.planAlternatives?.segments.find(s => s.id === segment.id);
  const backupMatches = backup && backup.title === segment.title && routeKey(legEndpoints(city, { ...day, segments: day.segments.map(s => baselineDay?.segments.find(b => b.id === s.id) ?? s).map(s => baselineDay?.planAlternatives?.segments.find(b => b.id === s.id) ?? s) }, backup)) === routeKey(endpoints);
  const allowance = unchanged && segment.title === baseline.title ? baseline.transportFromPrevious : backupMatches ? backup.transportFromPrevious : undefined;
  const minutes = allowance?.match(/(?:estimate: )?(\d+)(?:[–-](\d+))? min/);
  if (!allowance && endpoints.origin === endpoints.destination) return { ...endpoints, directionsUrl, durationMinutes: 0, plannedDurationMinutes: 0, status: 'planned', durationLabel: 'Already here · allow time for the activity', source: 'planning-estimate' };
  return {
    ...endpoints, directionsUrl,
    durationMinutes: minutes ? Number(minutes[2] ?? minutes[1]) : undefined,
    durationLabel: allowance ?? 'Travel time unavailable · check Google Maps',
    plannedDurationMinutes: minutes ? Number(minutes[2] ?? minutes[1]) : undefined,
    status: 'planned', source: allowance ? 'planning-estimate' : 'unavailable'
  };
}

export function routeDisplay(leg: RouteLeg, online: boolean): string {
  const age = leg.lastUpdated ? Date.now() - Date.parse(leg.lastUpdated) : Infinity;
  if (leg.source === 'google-routes' && (!online || age < 0 || age >= 15 * 60 * 1000)) {
    return (leg.plannedDurationMinutes !== undefined ? leg.plannedDurationMinutes + ' min · planned' : 'Check Maps · no planned time') + ' · saved live estimate is stale';
  }
  return leg.durationLabel;
}

export function rebaseTripRoutes(trip: Trip): Trip {
  return { ...trip, cities: trip.cities.map(city => ({ ...city, days: city.days.map(day => ({
    ...day, segments: day.segments.filter(isActiveStop).map((segment, orderIndex) => ({
      ...segment, orderIndex, routeFromPrevious: buildRouteLeg(city, day, segment)
    }))
  })) })) };
}
