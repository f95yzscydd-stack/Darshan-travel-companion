import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripRepository } from '@/src/db/repository';
import { Trip } from '@/src/types/models';

const KEY = '@portugal-companion/trip';

export const tripRepository: TripRepository = {
  async loadTrip() {
    const payload = await AsyncStorage.getItem(KEY);
    if (!payload) return null;
    const trip = JSON.parse(payload) as Trip;
    const normalizeSyncStatus = (status: string): Trip['syncStatus'] =>
      status === 'local' ? 'local-only' : status as Trip['syncStatus'];
    return {
      ...trip,
      syncStatus: normalizeSyncStatus(String(trip.syncStatus)),
      cities: trip.cities.map(city => ({
        ...city,
        days: city.days.map(day => ({
          ...day,
          segments: day.segments.map(segment => ({
            ...segment,
            syncStatus: normalizeSyncStatus(String(segment.syncStatus))
          }))
        }))
      }))
    };
  },
  async saveTrip(trip) {
    await AsyncStorage.setItem(KEY, JSON.stringify(trip));
  }
};
