import { GooglePlaceMetadata } from '@/src/types/models';

export const metadataTimestamp = (metadata?: GooglePlaceMetadata) => metadata?.lastUpdated ?? metadata?.fetchedAt;
export const isOpenStatusFresh = (metadata?: GooglePlaceMetadata, now = Date.now()) => {
  const timestamp = metadataTimestamp(metadata);
  const age = timestamp ? now - Date.parse(timestamp) : Infinity;
  return metadata?.openNow !== undefined && metadata.cacheState !== 'historical' && age >= 0 && age < 15 * 60 * 1000;
};

export function normalizeMetadata(metadata?: GooglePlaceMetadata): GooglePlaceMetadata | undefined {
  if (!metadata) return undefined;
  const timestamp = metadataTimestamp(metadata);
  return {
    ...metadata,
    lastUpdated: timestamp,
    cacheState: metadata.cacheState === 'historical' ? 'historical' : 'cached',
    // Never persist an undated opening assertion as current truth.
    openNow: isOpenStatusFresh(metadata) ? metadata.openNow : undefined
  };
}
