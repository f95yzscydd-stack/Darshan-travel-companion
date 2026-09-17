import data from './mallorca.seed.json';
import type { AlternativePlace, CityPlan, GooglePlaceMetadata, ItinerarySegment, RouteMode, Trip } from '@/src/types/models';
import type { CoffeeRecommendation } from './coffeeStops';
import { googleMapsSearchUrl } from '@/src/utils/maps';

const source = data.cityPlan;
type RawPlace = typeof data.places[number];
type RawSegment = typeof source.days[number]['segments'][number] & { estimatedCost?: { amount: number; currency: string; basis: string } };
const places = new Map(data.places.map(place => [place.id, place]));
const stamp = '2026-09-17T00:00:00.000Z';
export const mallorcaLinks = {
  tib: 'https://www.tib.org/en/lineas-y-horarios/autobus/-/linia/334',
  dgt: 'https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/estado-del-trafico/rutas-de-interes/2026_Formentor_ESP.pdf',
  boat: 'https://www.barcoscalobra.com/horarios-precios/'
};
function metadata(place?: RawPlace): GooglePlaceMetadata | undefined {
  const snapshot = place?.reviewSnapshot;
  return snapshot ? { rating: snapshot.rating, reviewCount: snapshot.count,
    lastUpdated: snapshot.fetchedAt, fetchedAt: snapshot.fetchedAt, source: 'google-maps',
    cacheState: 'historical', reviewSummary: 'Imported Google/web snapshot supplied with the itinerary; refresh to verify current data.' } : undefined;
}
function alternative(id: string): AlternativePlace {
  const p = places.get(id);
  if (!p) throw new Error('Unknown Mallorca place: ' + id);
  return { id: 'mallorca-place-' + p.id, name: p.name, city: source.city, category: p.category,
    googlePlaceQuery: p.googlePlaceQuery, googleMapsUrl: p.googleMapsUrl, curated: true,
    description: p.notes?.join(' ') ?? p.name, metadata: metadata(p),
    recommendedDishes: [...(p.coffeeProfile?.recommendedDrinks ?? []), ...(p.coffeeProfile?.recommendedPastries ?? [])],
    reservationRecommended: p.reservationRecommended, unavailableOnPlannedDate: id === 'kingfisher',
    status: 'backup' };
}
const stay = (id: string) => source.stays.find(s => s.id === id)!;
const queryOverrides: Record<string, string> = {
  'd1-flight': 'Palma de Mallorca Airport', 'd1-pine': 'Pine Walk Port de Pollenca Mallorca',
  'd2-bus': 'Port de Pollença Centre TIB 334', 'd2-return': 'Port de Pollença Centre',
  'd3-checkout': stay('stay-port-pollenca').address,
  'd3-boat-out': 'Sa Calobra Mallorca', 'd3-boat-back': 'Barcos Azules Port de Soller',
  'd4-return': stay('stay-salino').address, 'd5-checkout': stay('stay-salino').address,
  'd5-reset': stay('stay-garonda').address, 'd5-portals': 'Puerto Portals Mallorca',
  'd6-depart': stay('stay-garonda').address, 'd6-returnhotel': stay('stay-garonda').address,
  'd7-morning': stay('stay-garonda').address, 'd7-uberback': stay('stay-garonda').address,
  'd8-flight': 'Lisbon Airport Portugal'
};
function segment(raw: RawSegment, date: string): ItinerarySegment {
  const p = raw.placeId ? places.get(raw.placeId) : undefined;
  const query = p?.googlePlaceQuery ?? queryOverrides[raw.id] ?? raw.title + ', Mallorca Spain';
  const transport = raw.transportFromPrevious;
  const boat = raw.category === 'boat';
  const rental = raw.id === 'd1-hertz';
  const amount = rental ? 231.30 : raw.estimatedCost ? raw.estimatedCost.amount * 2 : 0;
  return {
    id: 'mallorca-' + raw.id, placeId: 'mallorca-place-' + (p?.id ?? raw.id), title: raw.title,
    date, timeBlock: raw.timeBlock, category: raw.category, orderIndex: raw.orderIndex,
    isLocked: raw.isLocked, isCompleted: false, description: [raw.description, ...(p?.notes ?? [])].join(' '),
    recommendedDishes: [...(p?.coffeeProfile?.recommendedDrinks ?? []), ...(p?.coffeeProfile?.recommendedPastries ?? [])],
    reservationRecommended: raw.reservationRecommended,
    priority: raw.priority === 'must-do' ? 'essential' : raw.priority === 'optional' ? 'flexible' : 'high',
    validationStatus: 'needs-check', googleMapsUrl: p?.googleMapsUrl ?? googleMapsSearchUrl(query),
    googlePlaceQuery: query, address: query, googlePlaceMetadata: metadata(p),
    routeMode: (transport?.mode ?? (raw.id === 'd3-market' ? 'driving' : raw.id.startsWith('d2-') && !['d2-breakfast', 'd2-dinner'].includes(raw.id) ? 'transit' : 'walking')) as RouteMode,
    routeKind: raw.category === 'flight' ? 'flight' : boat ? 'boat' : 'surface',
    plannedDurationMinutes: boat ? 60 : transport?.planningMinutes,
    transportFromPrevious: boat ? 'Planning estimate: 60 min by boat · reconfirm sailing' : transport ? 'Planning estimate: ' + transport.planningMinutes + ' min; not live.' : undefined,
    routeOriginOverride: raw.id === 'd1-flight' ? 'Porto Airport Portugal' : undefined,
    websiteUrl: boat ? mallorcaLinks.boat : raw.id.startsWith('d2-') && raw.category === 'transit' ? mallorcaLinks.tib : undefined,
    estimatedCost: amount, costUnknown: !rental && !raw.estimatedCost,
    costBasis: rental ? 'Total rental booking; fuel, parking and extras excluded' : raw.estimatedCost ? '2 adults × €35 round trip; reconfirm current fare' : undefined,
    currency: 'EUR', userNotes: '', syncStatus: 'local-only', updatedAt: stamp,
    alternatives: (raw.alternatives ?? []).map(alternative)
  };
}

export const mallorcaPlan: CityPlan = {
  id: source.id, city: source.city, country: source.country, status: 'active',
  startDate: source.startDate, endDate: source.endDate, nights: 7, timezone: source.timezone,
  stays: source.stays,
  transportBookings: source.transportBookings.map(booking => ({
    ...booking, type: booking.type as 'flight' | 'rental_car',
    ...(booking.type === 'rental_car' ? { prePickupChecklist: [
      'Transmission', 'CDW and theft excess', 'Fuel policy', 'Deposit', 'Mileage allowance'
    ].map((title, index) => ({ id: 'hertz-check-' + index, title, dueDate: '2026-09-25', completed: false })) } : {})
  })),
  tasks: [{ id: 'garonda-parking', title: 'Confirm overnight parking with Pure Salt Garonda for September 29; the Hertz car is still held.', dueDate: '2026-09-29', completed: false }],
  nearbyPlaces: data.places.filter(p => p.priority === 'backup').map(p => alternative(p.id)),
  days: source.days.map(raw => ({
    id: raw.id, date: raw.date, title: raw.title, theme: raw.theme, summary: '',
    stayId: raw.stayId,
    startStayId: raw.date === '2026-09-27' ? 'stay-port-pollenca' : raw.date === '2026-09-29' ? 'stay-salino' : raw.stayId,
    segments: raw.segments.map(s => segment(s, raw.date)),
    alerts: raw.date === '2026-09-26' ? [{
      title: 'High priority · Formentor access restrictions',
      message: 'May 15–October 18, 2026 · 10:00–22:00. Use TIB 334 from Port de Pollença. Private vehicles cannot continue to the lighthouse during restrictions. Beach parking access is capacity-controlled. Itinerary bus times are provisional; open the current timetable before departure.',
      links: [{ label: 'Refresh timetable · TIB 334', url: mallorcaLinks.tib }, { label: 'Official DGT access rules', url: mallorcaLinks.dgt }]
    }] : raw.date === '2026-09-27' ? [{
      title: 'Primary plan · Sa Calobra by boat',
      message: 'Planned 13:00 outbound / 16:40 return, about 60 minutes each way. €35 per adult round trip in the operator’s published 2026 fare list. Check weather, availability, times and prices the day before. Road backup is only suitable when road conditions are safe.',
      links: [{ label: 'Refresh boat times & prices · Barcos Azules', url: mallorcaLinks.boat }]
    }] : raw.date === '2026-09-28' ? [{
      title: 'Mountain roads & village parking',
      message: 'Allow extra time for winding roads, cyclists and limited village parking. Follow local signs and use designated spaces.'
    }] : raw.date === '2026-09-29' ? [{
      title: 'Parking/access · Es Trenc and Garonda',
      message: 'Allow time for paid beach parking and access. Listings indicate no on-site Garonda parking: confirm a legal overnight space for September 29 before arrival.'
    }] : raw.date === '2026-09-30' ? [{
      title: 'Beach access & early Hertz return',
      message: 'Calo des Moro has steep access and limited parking. Obey current signs; choose Cala Llombards if crowded or unsafe. Hertz deadline 23:00; target 21:30–22:00, then a rideshare to Garonda. Lunch is the main meal in the supplied plan; keep evening food flexible.'
    }] : raw.date === '2026-09-25' ? [{
      title: 'Confirmed flight timing · all times local',
      message: 'Booking supplied: easyJet EJU7384 departs OPO 08:35 and arrives PMI 11:20. The preserved Porto itinerary contains an older 08:00 departure; use this booking time and keep the existing early airport transfer buffer.'
    }] : []
  }))
};
const boatDay = mallorcaPlan.days.find(d => d.date === '2026-09-27')!;
boatDay.planChoice = 'primary';
boatDay.planAlternatives = {
  label: 'Weather/Crowd backup · Sa Calobra by road',
  segments: boatDay.segments.filter(s => ['mallorca-d3-boat-out', 'mallorca-d3-calobra', 'mallorca-d3-boat-back'].includes(s.id)).map(s =>
    s.category !== 'boat' ? { ...s, timeBlock: '14:45' } : { ...s,
      title: s.id.endsWith('boat-out') ? 'Drive from Port de Soller to Sa Calobra' : 'Drive back to Port de Soller',
      category: 'transport', routeKind: 'surface', routeMode: 'driving',
      plannedDurationMinutes: 90, transportFromPrevious: 'Planning estimate: 90 min; mountain road, not live.',
      estimatedCost: 0, costUnknown: true, costBasis: undefined, reservationRecommended: false,
      description: 'Weather backup only when roads are safe. Narrow hairpins, cyclists and paid parking; allow extra time. Do not drive into severe weather.',
      websiteUrl: undefined })
};

export function appendMallorca(trip: Trip): Trip {
  const cities = trip.cities.map(city => {
    if (city.stays?.length || !city.homeBase) return { ...city, stays: city.stays ?? [] };
    const base = city.homeBase;
    const id = base.id;
    return { ...city, stays: [{ id, name: city.city + ' Airbnb', type: 'airbnb', address: base.address,
      startDate: base.startDate, endDate: base.endDate, notes: base.notes ?? [], googleMapsUrl: googleMapsSearchUrl(base.address) }],
      days: city.days.map(day => ({ ...day, stayId: day.stayId ?? id })) };
  });
  if (!cities.some(city => city.id === source.id)) {
    const portoIndex = cities.findIndex(city => city.id === 'porto');
    cities.splice(portoIndex < 0 ? cities.length : portoIndex + 1, 0, JSON.parse(JSON.stringify(mallorcaPlan)) as CityPlan);
  }
  return { ...trip, schemaVersion: 7, countries: [...new Set([...(trip.countries ?? []), ...data.tripPatch.countries])],
    title: trip.title === 'Portugal + Mallorca 2026' || (trip.schemaVersion ?? 0) < 7 ? data.tripPatch.displayTitle : trip.title,
    endDate: trip.endDate > source.endDate ? trip.endDate : source.endDate,
    nights: Math.max(trip.nights, 13), cities,
    preferences: { ...trip.preferences, noPork: false, seafoodOkay: true,
      dietaryNotes: data.travelerPreferencesPatch.dietaryNotes, coffee: data.travelerPreferencesPatch.coffee }
  };
}

export function mallorcaCoffeeStops(dayId: string): CoffeeRecommendation[] {
  const rawDay = source.days.find(day => day.id === dayId);
  if (!rawDay) return [];
  const candidates = rawDay.segments.flatMap(s => [s.placeId, ...(s.alternatives ?? [])])
    .filter((id): id is string => Boolean(id));
  return [...new Set(candidates)].flatMap(id => {
    const p = places.get(id), c = p?.coffeeProfile;
    if (!p || !c) return [];
    const scheduled = rawDay.segments.find(s => s.placeId === id);
    return [{
      id: 'mallorca-' + dayId + '-' + id, dayId, city: 'Mallorca', name: p.name,
      address: p.googlePlaceQuery, googlePlaceQuery: p.googlePlaceQuery,
      aliases: scheduled ? [scheduled.title] : [], description: 'Optional coffee and local pastries along this day’s route.',
      style: c.style.includes('bakery') ? ['bakery' as const] : ['specialty' as const],
      routeRole: c.routeRole as CoffeeRecommendation['routeRole'], recommendedDrinks: c.recommendedDrinks,
      recommendedPastries: c.recommendedPastries, morningRecommended: c.morningRecommended ?? false,
      afternoonRecommended: c.afternoonRecommended ?? false, suggestedTime: scheduled?.timeBlock ?? (c.morningRecommended ? '09:00' : '14:30'),
      latestSuggestedCoffeeTime: c.latestSuggestedCoffeeTime ?? '15:45', badges: ['Optional', 'Prefer 5–10 min detour'],
      googleMapsUrl: p.googleMapsUrl, reviewSnapshot: p.reviewSnapshot ? {
        rating: p.reviewSnapshot.rating, count: p.reviewSnapshot.count, source: 'Google' as const, fetchedAt: p.reviewSnapshot.fetchedAt
      } : undefined
    }];
  });
}
