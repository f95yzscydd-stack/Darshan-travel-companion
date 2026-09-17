import { RouteMode } from '@/src/types/models';

export const googleMapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const googleMapsPlaceUrl = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const googleMapsDirectionsUrl = (
  origin?: string,
  destination?: string,
  mode: RouteMode = 'walking'
) => {
  const travelMode = mode === 'rideshare' ? 'driving' : mode;
  const params = new URLSearchParams({
    api: '1',
    destination: destination ?? origin ?? '',
    travelmode: travelMode
  });
  if (origin && destination) params.set('origin', origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
