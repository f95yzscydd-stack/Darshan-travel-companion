import NetInfo from '@react-native-community/netinfo';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { migrateTrip } from '@/src/data/migrateTrip';
import { tripRepository } from '@/src/db/storage';
import { refreshGooglePlace } from '@/src/services/googlePlaces';
import { getRouteEta } from '@/src/services/googleRoutes';
import { AlternativePlace, CoffeeStopProfile, GooglePlaceMetadata, ItinerarySegment, Trip } from '@/src/types/models';
import { rebaseTripRoutes, routeKey } from '@/src/utils/routes';

interface TripContextValue {
  trip: Trip;
  isHydrated: boolean;
  isOnline: boolean;
  storageError?: string;
  toggleComplete: (segmentId: string) => void;
  moveSegment: (dayId: string, segmentId: string, direction: -1 | 1) => void;
  addSegment: (dayId: string) => string;
  addCoffeeStop: (profile: CoffeeStopProfile) => string;
  saveCoffeeBackup: (dayId: string, profile: CoffeeStopProfile) => void;
  refreshPlaceMetadata: (query: string) => Promise<GooglePlaceMetadata | null>;
  refreshDayRoutes: (dayId: string) => Promise<number>;
  updateSegment: (segmentId: string, patch: Partial<ItinerarySegment>) => void;
  deleteSegment: (segmentId: string) => void;
  replaceSegment: (segmentId: string, replacement: AlternativePlace) => void;
  resetTrip: () => void;
  toggleTravelTask: (cityId: string, taskId: string) => void;
  swapDayPlan: (dayId: string) => void;
}
const TripContext = createContext<TripContextValue | null>(null);
const stamp = () => new Date().toISOString();
function coffeePlace(profile: CoffeeStopProfile, metadata?: GooglePlaceMetadata): AlternativePlace {
  return { id: `place-coffee-${profile.id}`, name: profile.name, city: profile.city, category: 'optional coffee',
    googlePlaceQuery: profile.googlePlaceQuery,
    address: profile.address,
    description: profile.description, recommendedDishes: [...profile.recommendedDrinks, ...profile.recommendedPastries],
    googleMapsUrl: profile.googleMapsUrl, metadata: metadata ?? (profile.reviewSnapshot?.source === 'Google' ? {
      rating: profile.reviewSnapshot.rating, reviewCount: profile.reviewSnapshot.count,
      lastUpdated: profile.reviewSnapshot.fetchedAt, fetchedAt: profile.reviewSnapshot.fetchedAt,
      source: 'google-maps', cacheState: 'historical'
    } : undefined), estimatedCost: 8, curated: true, status: 'backup' };
}

export function TripProvider({ children }: PropsWithChildren) {
  const [trip, setTrip] = useState<Trip>(() => migrateTrip(null));
  const [isHydrated, setHydrated] = useState(false);
  const [isOnline, setOnline] = useState(true);
  const [storageError, setStorageError] = useState<string>();
  const maySave = useRef(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    tripRepository.loadTrip().then(saved => {
      if (!active) return;
      setTrip(migrateTrip(saved)); maySave.current = true;
    }).catch(() => {
      if (active) setStorageError('Saved itinerary could not be loaded. Reload to retry; your stored data has not been overwritten.');
    }).finally(() => { if (active) setHydrated(true); });
    const unsubscribe = NetInfo.addEventListener(state => setOnline(Boolean(state.isConnected)));
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isHydrated || !maySave.current) return;
    saveQueue.current = saveQueue.current.then(() => tripRepository.saveTrip(trip))
      .then(() => setStorageError(undefined))
      .catch(() => setStorageError('Changes could not be saved. Keep this page open and try another edit to retry.'));
  }, [trip, isHydrated]);

  const mutateSegments = (mutator: (segments: ItinerarySegment[], dayId: string, city: string) => ItinerarySegment[]) => {
    if (!maySave.current) return;
    setTrip(current => rebaseTripRoutes({ ...current, syncStatus: 'pending', updatedAt: stamp(),
      cities: current.cities.map(city => ({ ...city,
        days: city.days.map(day => ({ ...day, segments: mutator(day.segments, day.id, city.city) }))
      }))
    }));
  };
  const value = useMemo<TripContextValue>(() => ({
    trip, isHydrated, isOnline, storageError,
    toggleComplete(segmentId) {
      mutateSegments(segments => segments.map(item => item.id === segmentId
        ? { ...item, isCompleted: !item.isCompleted, syncStatus: 'pending', updatedAt: stamp() } : item));
    },
    moveSegment(dayId, segmentId, direction) {
      mutateSegments((segments, currentDayId) => {
        if (currentDayId !== dayId) return segments;
        const index = segments.findIndex(item => item.id === segmentId), next = index + direction;
        if (index < 0 || next < 0 || next >= segments.length || segments[index].isLocked || segments[next].isLocked) return segments;
        const copy = [...segments];
        [copy[index], copy[next]] = [copy[next], copy[index]];
        return copy.map((item, orderIndex) => ({ ...item, orderIndex, syncStatus: 'pending' }));
      });
    },
    addSegment(dayId) {
      const id = `custom-${Date.now()}`;
      mutateSegments((segments, currentDayId) => currentDayId === dayId ? [...segments, {
        id, title: 'New flexible stop', date: trip.cities.flatMap(city => city.days).find(day => day.id === dayId)?.date ?? trip.startDate,
        timeBlock: 'TBD', category: 'miscellaneous', placeId: `place-${id}`, orderIndex: segments.length,
        isLocked: false, isCompleted: false, description: 'Add the details for this stop.', recommendedDishes: [],
        reservationRecommended: false, googleMapsUrl: 'https://www.google.com/maps', priority: 'flexible',
        validationStatus: 'needs-check', estimatedCost: 0, currency: 'EUR', userNotes: '', alternatives: [],
        syncStatus: 'pending', updatedAt: stamp()
      }] : segments);
      return id;
    },
    addCoffeeStop(profile) {
      const id = `coffee-${profile.id}`;
      const place = coffeePlace(profile, trip.placeMetadataCache?.[profile.googlePlaceQuery ?? `${profile.name} ${profile.city}`]);
      mutateSegments((segments, dayId) => {
        if (dayId !== profile.dayId || segments.some(segment => segment.id === id)) return segments;
        const added: ItinerarySegment = {
          id, title: place.name, date: trip.cities.flatMap(city => city.days).find(day => day.id === dayId)?.date ?? trip.startDate,
          googlePlaceQuery: profile.googlePlaceQuery,
          address: profile.address, routeMode: profile.routeMode,
          timeBlock: profile.suggestedTime, category: place.category, placeId: place.id, orderIndex: segments.length,
          isLocked: false, isCompleted: false, description: profile.description, recommendedDishes: place.recommendedDishes ?? [],
          reservationRecommended: false, googleMapsUrl: profile.googleMapsUrl, priority: 'flexible', validationStatus: 'approved',
          googlePlaceMetadata: place.metadata, estimatedCost: 8, currency: 'EUR', userNotes: '', alternatives: [],
          syncStatus: 'pending', updatedAt: stamp()
        };
        // Insert without re-sorting the user's existing order.
        const index = segments.findIndex(item => item.timeBlock > profile.suggestedTime);
        const copy = [...segments]; copy.splice(index < 0 ? copy.length : index, 0, added);
        return copy;
      });
      return id;
    },
    saveCoffeeBackup(dayId, profile) {
      if (!maySave.current) return;
      const backup = coffeePlace(profile, trip.placeMetadataCache?.[profile.googlePlaceQuery ?? `${profile.name} ${profile.city}`]);
      setTrip(current => ({ ...current, updatedAt: stamp(), syncStatus: 'pending', cities: current.cities.map(city => ({ ...city,
        days: city.days.map(day => day.id !== dayId || day.backups?.some(item => item.id === backup.id) ? day : {
          ...day, backups: [...(day.backups ?? []), backup]
        })
      })) }));
    },
    async refreshPlaceMetadata(query) {
      if (!isOnline || !maySave.current) return null;
      const metadata = await refreshGooglePlace(query);
      if (metadata) setTrip(current => ({ ...current,
        placeMetadataCache: { ...current.placeMetadataCache, [query]: metadata },
        cities: current.cities.map(city => ({ ...city, days: city.days.map(day => ({ ...day,
          segments: day.segments.map(segment => (segment.googlePlaceQuery ?? `${segment.title} ${city.city}`) === query
            ? { ...segment, googlePlaceMetadata: metadata } : segment)
        })) }))
      }));
      return metadata;
    },
    async refreshDayRoutes(dayId) {
      if (!isOnline || !maySave.current) return 0;
      const day = trip.cities.flatMap(city => city.days).find(item => item.id === dayId);
      if (!day) return 0;
      const results = await Promise.allSettled(day.segments.map(async segment => {
        const leg = segment.routeFromPrevious;
        if (!leg || leg.origin === leg.destination || segment.routeKind === 'boat' || segment.routeKind === 'flight') return null;
        const estimate = await getRouteEta(leg.origin, leg.destination, leg.mode);
        return estimate ? { id: segment.id, key: routeKey(leg), estimate } : null;
      }));
      const updates = new Map(results.flatMap(result => result.status === 'fulfilled' && result.value ? [[result.value.id, result.value] as const] : []));
      mutateSegments((segments, id) => id !== dayId ? segments : segments.map(segment => {
        const update = updates.get(segment.id), leg = segment.routeFromPrevious;
        if (!update || !leg || routeKey(leg) !== update.key) return segment;
        return { ...segment, routeFromPrevious: { ...leg, source: 'google-routes',
          status: 'live', liveDurationMinutes: update.estimate.durationMinutes,
          plannedDurationMinutes: leg.plannedDurationMinutes ?? (leg.source === 'planning-estimate' ? leg.durationMinutes : undefined),
          durationMinutes: update.estimate.durationMinutes, durationLabel: `${Math.ceil(update.estimate.durationMinutes)} min · Google Routes estimate`,
          lastUpdated: update.estimate.lastUpdated
        } };
      }));
      return updates.size;
    },
    updateSegment(segmentId, patch) {
      mutateSegments(segments => segments.map(item => {
        if (item.id !== segmentId) return item;
        const allowed = item.isLocked ? {
          ...(patch.userNotes !== undefined ? { userNotes: patch.userNotes } : {}),
          ...('actualCost' in patch ? { actualCost: patch.actualCost } : {})
        } : patch;
        return { ...item, ...allowed, syncStatus: 'pending', updatedAt: stamp() };
      }));
    },
    deleteSegment(segmentId) {
      mutateSegments(segments => segments.filter(item => item.id !== segmentId || item.isLocked));
    },
    replaceSegment(segmentId, replacement) {
      if (replacement.unavailableOnPlannedDate || replacement.status === 'archived') return;
      mutateSegments((segments, _dayId, city) => segments.map(item => {
        if (item.id !== segmentId || item.isLocked) return item;
        const backup: AlternativePlace = { id: item.placeId, name: item.title, city, category: item.category,
          googlePlaceQuery: item.googlePlaceQuery, reservationRecommended: item.reservationRecommended,
          address: item.address, description: item.description, recommendedDishes: item.recommendedDishes,
          dietaryNotes: item.dietaryNotes, googleMapsUrl: item.googleMapsUrl, estimatedCost: item.estimatedCost,
          metadata: item.googlePlaceMetadata, curated: true, status: 'backup' };
        return { ...item, title: replacement.name, placeId: replacement.id, category: replacement.category,
          googlePlaceQuery: replacement.googlePlaceQuery,
          address: replacement.address, routeFromPrevious: undefined,
          description: replacement.description ?? `Curated alternative: ${replacement.vibe ?? 'a nearby option'}.`,
          recommendedDishes: replacement.recommendedDishes ?? [], dietaryNotes: replacement.dietaryNotes,
          googleMapsUrl: replacement.googleMapsUrl ?? item.googleMapsUrl, websiteUrl: replacement.websiteUrl,
          googlePlaceMetadata: replacement.metadata, estimatedCost: replacement.estimatedCost ?? item.estimatedCost,
          isCompleted: false, reservationRecommended: replacement.reservationRecommended ?? false, bookingNote: undefined, status: 'active',
          alternatives: [...item.alternatives.filter(alt => alt.id !== replacement.id && alt.id !== backup.id), backup],
          syncStatus: 'pending', updatedAt: stamp() };
      }));
    },
    toggleTravelTask(cityId, taskId) {
      if (!maySave.current) return;
      const toggle = (task: NonNullable<Trip['cities'][number]['tasks']>[number]) => task.id === taskId ? { ...task, completed: !task.completed } : task;
      setTrip(current => ({ ...current, updatedAt: stamp(), cities: current.cities.map(city => city.id !== cityId ? city : {
        ...city, tasks: city.tasks?.map(toggle), transportBookings: city.transportBookings?.map(booking => ({
          ...booking, prePickupChecklist: booking.prePickupChecklist?.map(toggle)
        }))
      }) }));
    },
    swapDayPlan(dayId) {
      if (!maySave.current) return;
      setTrip(current => rebaseTripRoutes({ ...current, updatedAt: stamp(), cities: current.cities.map(city => ({
        ...city, days: city.days.map(day => {
          if (day.id !== dayId || !day.planAlternatives) return day;
          const replacements = new Map(day.planAlternatives.segments.map(s => [s.id, s]));
          const outgoing = day.segments.filter(s => replacements.has(s.id));
          return { ...day, planChoice: day.planChoice === 'backup' ? 'primary' : 'backup',
            planAlternatives: { label: day.planChoice === 'backup' ? 'Weather/Crowd backup · Sa Calobra by road' : 'Primary plan · Sa Calobra by boat', segments: outgoing },
            segments: day.segments.map(s => {
              const next = replacements.get(s.id);
              return next ? { ...next, orderIndex: s.orderIndex, actualCost: s.actualCost, userNotes: s.userNotes, routeFromPrevious: undefined } : s;
            })
          };
        })
      })) }));
    },
    resetTrip() { if (maySave.current) setTrip(migrateTrip(null)); }
  }), [trip, isHydrated, isOnline, storageError]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
export function useTrip() {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrip must be used inside TripProvider');
  return context;
}
