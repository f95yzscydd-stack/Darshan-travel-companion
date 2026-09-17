import { RouteMode } from '@/src/types/models';
import { requestTravelApi, googlePlacesConfigured } from './googlePlaces';

export interface RouteEstimate {
  distanceMeters: number;
  durationMinutes: number;
  encodedPolyline?: string;
  lastUpdated?: string;
}

export interface GoogleRoutesService {
  getRouteEta(
    originPlaceId: string,
    destinationPlaceId: string,
    mode?: RouteMode
  ): Promise<RouteEstimate | null>;
}

/**
 * Phase 2 adapter boundary for Google Routes API Compute Routes.
 * Keep credentials on a backend and return only the ETA fields the app needs.
 */
export const googleRoutesService: GoogleRoutesService = {
  async getRouteEta(origin, destination, mode = 'walking') {
    const route = await requestTravelApi<RouteEstimate>('/routes/estimate', { origin, destination, mode });
    if (!route) return null;
    if (!Number.isFinite(route.durationMinutes) || route.durationMinutes < 0 || !route.lastUpdated || !Number.isFinite(Date.parse(route.lastUpdated))) {
      throw new Error('Route response has no valid duration or timestamp');
    }
    return route;
  }
};

export const googleRoutesConfigured = googlePlacesConfigured;

export const getRouteEta = googleRoutesService.getRouteEta;
export const getRouteEstimate = googleRoutesService.getRouteEta;
