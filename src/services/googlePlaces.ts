import { AlternativePlace, GooglePlaceMetadata } from '@/src/types/models';

export type GooglePlaceCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'tourist_attraction';

export interface AlternativeSearchParams {
  location: { lat: number; lng: number };
  radiusMeters: number;
  category: GooglePlaceCategory;
  openNow?: boolean;
  maxPriceLevel?: number;
  keyword?: string;
}

export interface GooglePlacesService {
  findAlternatives(params: AlternativeSearchParams): Promise<AlternativePlace[]>;
  getPlaceMetadata(googlePlaceId: string): Promise<GooglePlaceMetadata | null>;
}

const serviceUrl = process.env.EXPO_PUBLIC_TRAVEL_API_URL?.replace(/\/$/, '');
export const googlePlacesConfigured = Boolean(serviceUrl);

/** Backend returns a normalized, timestamped response; no Google key enters the client. */
export async function requestTravelApi<T>(path: string, body: unknown): Promise<T | null> {
  if (!serviceUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${serviceUrl}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal
    });
    if (!response.ok) throw new Error(`Travel service unavailable (${response.status})`);
    return await response.json() as T;
  } finally { clearTimeout(timeout); }
}

export async function refreshGooglePlace(query: string): Promise<GooglePlaceMetadata | null> {
  const metadata = await requestTravelApi<GooglePlaceMetadata>('/places/metadata', { query });
  if (!metadata) return null;
  const lastUpdated = metadata.lastUpdated ?? metadata.fetchedAt;
  if (!lastUpdated || !Number.isFinite(Date.parse(lastUpdated))) throw new Error('Place response has no valid update timestamp');
  return { ...metadata, source: 'google-maps', lastUpdated, cacheState: 'cached' };
}

/**
 * Phase 2 adapter boundary.
 *
 * The production implementation should call a secure backend, not Google
 * directly from the app. The backend owns the API key, applies a field mask,
 * and maps Nearby Search or Text Search results into AlternativePlace. Place
 * photo responses should populate metadata.photoUrl and photoAttribution;
 * attribution must remain visible wherever the image is rendered.
 */
export const googlePlacesService: GooglePlacesService = {
  async findAlternatives(params) {
    return await requestTravelApi<AlternativePlace[]>('/places/alternatives', params) ?? [];
  },
  async getPlaceMetadata(googlePlaceId) {
    return refreshGooglePlace(googlePlaceId);
  }
};

export const findAlternatives = googlePlacesService.findAlternatives;
export const getPlaceMetadata = googlePlacesService.getPlaceMetadata;
