import { Trip } from '@/src/types/models';

export interface TripRepository {
  loadTrip(): Promise<Trip | null>;
  saveTrip(trip: Trip): Promise<void>;
}
