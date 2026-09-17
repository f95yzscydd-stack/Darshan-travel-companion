import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { AppState, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { useTrip } from '@/src/context/TripContext';
import { coffeeHomeAddresses, coffeeRouteHints, coffeeStopsByDay } from '@/src/data/coffeeStops';
import type { CoffeeRecommendation } from '@/src/data/coffeeStops';
import { seedTrip } from '@/src/data/seed';
import { googlePlacesConfigured } from '@/src/services/googlePlaces';
import type { AlternativePlace, CityPlan, GooglePlaceMetadata, ItineraryDay, ItinerarySegment, RouteMode, Trip } from '@/src/types/models';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';
import { googleMapsDirectionsUrl } from '@/src/utils/maps';
import { isOpenStatusFresh, metadataTimestamp } from '@/src/utils/placeMetadata';
import { destinationFor, isActiveStop } from '@/src/utils/routes';

const OPEN_STATUS_LIFETIME = 15 * 60 * 1000;
const countFormatter = new Intl.NumberFormat('en-CA');
const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const normalizeName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const matchesName = (profile: CoffeeRecommendation, name: string) =>
  [profile.name, ...(profile.aliases ?? [])].some(alias => normalizeName(alias) === normalizeName(name));
const validRating = (value?: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
const validCount = (value?: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const dated = (timestamp?: string) => timestamp && /^\d{4}-\d{2}-\d{2}$/.test(timestamp) ? timestamp : timestamp && Number.isFinite(Date.parse(timestamp))
  ? dateFormatter.format(new Date(timestamp)) : 'date unknown';
const rangeLabel = (range?: readonly [number, number]) => range ? `~${range[0]}–${range[1]} min` : 'Unknown · check Maps';

const localityFor = (query: string) => {
  const name = normalizeName(query);
  if (/rossio|lisbon|lisboa/.test(name)) return 'Lisbon';
  if (/sintra|penapalace|regaleira/.test(name)) return 'Sintra';
  if (/obidos/.test(name)) return 'Óbidos';
  if (/nazare/.test(name)) return 'Nazaré';
  if (/matosinhos/.test(name)) return 'Matosinhos';
  if (/gaia/.test(name)) return 'Gaia';
  if (/porto|foz/.test(name)) return 'Porto';
  return undefined;
};

function coffeePosition(profile: CoffeeRecommendation, segments: ItinerarySegment[]) {
  const existing = segments.findIndex(segment => matchesName(profile, segment.title));
  // Match addCoffeeStop: insert AFTER existing stops at the same time.
  const insertion = segments.findIndex(segment => segment.timeBlock > profile.suggestedTime);
  const index = existing >= 0 ? existing : insertion >= 0 ? insertion : segments.length;
  return { previous: segments[index - 1], next: segments[index + (existing >= 0 ? 1 : 0)] };
}

function metadataFor(profile: CoffeeRecommendation, cache?: Trip['placeMetadataCache']): GooglePlaceMetadata | undefined {
  const cached = cache?.[profile.googlePlaceQuery ?? `${profile.name} ${profile.city}`];
  if (cached) return cached;
  // Preserve older fetched records, but never manufacture a fetch timestamp.
  const legacy = profile.livePlaceData;
  return legacy ? {
    googlePlaceId: legacy.googlePlaceId, rating: legacy.rating, reviewCount: legacy.userRatingCount,
    photoUrl: legacy.imageUrl, photoAttribution: legacy.photoAttribution,
    openNow: legacy.openNow, fetchedAt: legacy.lastFetchedAt, cacheState: 'cached', source: 'google-maps'
  } : undefined;
}

function historicalMetadata(profile: CoffeeRecommendation): GooglePlaceMetadata | undefined {
  const snapshot = profile.reviewSnapshot;
  return snapshot?.source === 'Google' ? {
    rating: snapshot.rating, reviewCount: snapshot.count, source: 'google-maps',
    fetchedAt: snapshot.fetchedAt, lastUpdated: snapshot.fetchedAt, cacheState: 'historical'
  } : undefined;
}

function toAlternative(profile: CoffeeRecommendation, metadata?: GooglePlaceMetadata): AlternativePlace {
  return {
    id: `place-coffee-${profile.id}`, name: profile.name, city: profile.city, address: profile.address,
    googlePlaceQuery: profile.googlePlaceQuery,
    category: 'optional coffee', description: profile.description,
    recommendedDishes: [...new Set([...profile.recommendedDrinks, ...profile.recommendedPastries, ...(profile.uniqueDrink ? [profile.uniqueDrink] : [])])],
    googleMapsUrl: profile.googleMapsUrl, metadata: metadata ?? historicalMetadata(profile),
    curated: true, estimatedCost: 8
  };
}

function routeFor(profile: CoffeeRecommendation, city: CityPlan, day: ItineraryDay, trip: Trip) {
  const active = day.segments.filter(isActiveStop).sort((a, b) => a.orderIndex - b.orderIndex);
  const { previous, next } = coffeePosition(profile, active);
  // The road-trip morning still starts in Lisbon although its day belongs to Porto.
  const baseCity = profile.city === 'Lisbon' ? 'Lisbon' : city.city;
  const home = trip.cities.find(item => item.city === baseCity)?.homeBase;
  const fallbackHome = baseCity === 'Lisbon' ? coffeeHomeAddresses.Lisbon : coffeeHomeAddresses.Porto;
  const dayStay = city.stays?.find(stay => stay.id === (day.startStayId ?? day.stayId));
  const homeAddress = dayStay?.address ?? home?.address ?? fallbackHome;
  const origin = previous ? destinationFor(previous, city) : homeAddress;
  const atHome = !previous || normalizeName(origin) === normalizeName(homeAddress);
  const anchor = atHome ? `home:${baseCity}` : previous.title;
  const hint = coffeeRouteHints[profile.id];
  const baselineCity = seedTrip.cities.find(item => item.id === city.id);
  const baselineDay = baselineCity?.days.find(item => item.id === day.id);
  const baseline = coffeePosition(profile, baselineDay?.segments.filter(isActiveStop) ?? []);
  const sameOrigin = atHome ? normalizeName(homeAddress) === normalizeName(fallbackHome)
    : Boolean(baselineCity && baseline.previous && origin === destinationFor(baseline.previous, baselineCity));
  const sameNext = next && baseline.next && baselineCity
    ? destinationFor(next, city) === destinationFor(baseline.next, baselineCity) : !next && !baseline.next;
  const matchesAnchor = hint?.from.some(from => from.startsWith('home:')
    ? from === anchor && normalizeName(homeAddress) === normalizeName(fallbackHome)
    : !atHome && normalizeName(anchor).includes(normalizeName(from)));
  const destination = profile.googlePlaceQuery ?? `${profile.name}, ${profile.address ?? profile.city}, ${city.country}`;
  const fromLocality = localityFor(origin);
  const toLocality = localityFor(destination);
  const differentLocality = fromLocality && toLocality && fromLocality !== toLocality;
  const acrossDouro = fromLocality && toLocality && [fromLocality, toLocality].every(value => value === 'Porto' || value === 'Gaia');
  const mode: RouteMode = differentLocality && !acrossDouro
    ? profile.dayId === 'porto-day-1' ? 'driving' : 'transit'
    : profile.routeMode ?? 'walking';
  const walkingEstimateValid = mode === 'walking' && matchesAnchor && sameOrigin;
  return {
    origin, originLabel: atHome ? dayStay?.name ?? `${baseCity} Airbnb` : previous.title,
    mode,
    url: googleMapsDirectionsUrl(origin, destination, mode),
    walking: walkingEstimateValid ? hint?.walkingMinutes : undefined,
    detour: walkingEstimateValid && sameNext ? hint?.detourMinutes : undefined,
    note: hint?.note,
    changed: Boolean(hint?.from.length && (!matchesAnchor || !sameOrigin || !sameNext))
  };
}

function CoffeeAction({ label, icon, onPress, disabled = false, primary = false, selected = false }: {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.action, primary && styles.primaryAction, selected && styles.selectedAction, disabled && styles.disabledAction, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon} size={16} color={primary ? colors.white : colors.forestDark} />
      <Text style={[styles.actionText, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

function CoffeeCard({ profile, metadata, route, isAdded, isSaved, isOnline, canEdit, now, replaceableStops, onAdd, onSave, onReplace, onRefresh }: {
  profile: CoffeeRecommendation;
  metadata?: GooglePlaceMetadata;
  route: ReturnType<typeof routeFor>;
  isAdded: boolean;
  isSaved: boolean;
  isOnline: boolean;
  canEdit: boolean;
  now: number;
  replaceableStops: ItinerarySegment[];
  onAdd: () => void;
  onSave: () => void;
  onReplace: (id: string) => boolean;
  onRefresh: () => Promise<GooglePlaceMetadata | null>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);
  const [failedImage, setFailedImage] = useState<string | undefined>();
  const hasFreshOpenStatus = isOnline && typeof metadata?.openNow === 'boolean' && isOpenStatusFresh(metadata, now);
  const selectedStop = replaceableStops.find(stop => stop.id === replacementId);
  const imageUrl = metadata?.photoUrl;
  const snapshot = profile.reviewSnapshot;
  // Keep each rating/count pair with its own provenance and timestamp.
  const hasFetchedReviews = validRating(metadata?.rating) || validCount(metadata?.reviewCount);
  const rating = hasFetchedReviews ? metadata?.rating : snapshot?.rating;
  const reviewCount = hasFetchedReviews ? metadata?.reviewCount : snapshot?.count;
  const reviewSource = hasFetchedReviews ? 'Google Places' : snapshot?.source;
  const reviewDate = hasFetchedReviews ? metadataTimestamp(metadata) : snapshot?.fetchedAt;
  const historical = hasFetchedReviews ? metadata?.cacheState === 'historical' : Boolean(snapshot);
  const staple = profile.badges.some(badge => /staple/i.test(badge));
  const trendy = profile.badges.some(badge => /trendy/i.test(badge));
  const seating = profile.seatingType ? {
    takeaway: 'Takeaway-focused', limited: 'Limited seating', comfortable: 'Seated café', terrace: 'Terrace seating'
  }[profile.seatingType] : 'Unknown · check with café';
  const openLink = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { setFeedback('Could not open Maps. Please try again when a Maps app or browser is available.'); }
  };
  const refresh = async () => {
    if (refreshInFlight.current || !isOnline || !googlePlacesConfigured) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    setFeedback('');
    try {
      const result = await onRefresh();
      setFeedback(result ? 'Place details refreshed. Opening status is shown only when recent and online.' : 'No new place details returned. Saved details are unchanged; check hours in Maps.');
    } catch {
      setFeedback('Refresh unavailable. Saved details are unchanged; check hours in Maps.');
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  };
  const mutate = (action: () => void, message: string) => {
    try { action(); setFeedback(message); }
    catch { setFeedback('This change could not be saved. Please try again.'); }
  };
  return (
    <View style={styles.card}>
      {imageUrl && imageUrl !== failedImage ? (
        <View>
          <Image source={{ uri: imageUrl, cache: 'force-cache' }} accessibilityLabel={`${profile.name} · Google Places photo`} style={styles.image} onError={() => setFailedImage(imageUrl)} />
          <Text style={styles.attribution}>Google Places photo · {dated(metadataTimestamp(metadata))}{metadata?.photoAttribution ? ` · ${metadata.photoAttribution}` : ''}</Text>
        </View>
      ) : (
        <LinearGradient colors={[colors.sky, colors.mint]} style={styles.imagePlaceholder}>
          <MaterialCommunityIcons name="coffee-outline" size={30} color={colors.forestDark} />
          <Text style={styles.imageText}>{imageUrl === failedImage && imageUrl ? 'Photo unavailable · view in Maps' : 'No fetched photo · photos in Maps'}</Text>
        </LinearGradient>
      )}
      <View style={styles.body}>
        <View style={styles.cardTop}>
          <View style={styles.heading}>
            <Text style={styles.route}>{profile.routeRole.replace(/-/g, ' ')} · suggested {profile.suggestedTime}</Text>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.city}>{profile.address ?? profile.city}</Text>
          </View>
          <Badge tone={hasFreshOpenStatus ? metadata?.openNow ? 'mint' : 'sand' : 'sky'}>
            {hasFreshOpenStatus ? metadata?.openNow ? 'Open now' : 'Closed now' : isOnline ? 'Check hours' : 'Offline · hours unknown'}
          </Badge>
        </View>
        <View style={styles.rating}>
          <MaterialCommunityIcons name="star" size={14} color={colors.gold} />
          <Text style={styles.ratingText}>{validRating(rating) ? rating.toFixed(1) : 'Rating unknown'}</Text>
          <Text style={styles.ratingCount}>{validCount(reviewCount) ? `${countFormatter.format(reviewCount)} reviews` : 'Review count unknown'}</Text>
        </View>
        {reviewSource ? <Text style={styles.freshness}>{historical ? 'Historical seed snapshot' : 'Fetched / cached snapshot'} · {reviewSource} · {dated(reviewDate)}. Not a current guarantee.</Text> : null}
        <Text style={styles.description}>{profile.description}</Text>
        {metadata?.openingHours?.length ? <Text style={styles.freshness}>Saved opening hours · {dated(metadataTimestamp(metadata))}: {metadata.openingHours.join(' · ')}</Text> : null}
        <View style={styles.recommendations}>
          <View style={styles.recommendation}><Text style={styles.label}>BEST DRINK · CURATED</Text><Text style={styles.value}>{profile.recommendedDrinks.slice(0, 2).join(' · ') || 'Unknown · ask the barista'}</Text></View>
          <View style={styles.recommendation}><Text style={styles.label}>BEST PASTRY · CURATED</Text><Text style={styles.value}>{profile.recommendedPastries.slice(0, 2).join(' · ') || 'Not verified · check the counter'}</Text></View>
          <View style={styles.recommendation}><Text style={styles.label}>UNIQUE DRINK</Text><Text style={styles.value}>{profile.uniqueDrink ?? 'Not verified · ask the barista'}</Text></View>
          <View style={styles.recommendation}><Text style={styles.label}>SEATING</Text><Text style={styles.value}>{seating}{profile.seatingType ? ' · curated, confirm availability' : ''}</Text></View>
        </View>
        <View style={styles.badges}>
          <Badge tone="sky">Optional addition</Badge>
          <Badge tone={staple ? 'sand' : trendy ? 'blush' : 'sky'}>{staple ? 'Established staple · curated' : trendy ? 'Trendy style · age unverified' : 'Staple / trendy: unknown'}</Badge>
          {profile.badges.filter(badge => !/staple|trendy/i.test(badge)).slice(0, 2).map(badge => <Badge key={badge}>{badge}</Badge>)}
          {profile.decafAvailable ? <Badge tone="sky">Decaf · confirm</Badge> : null}
          {profile.latestSuggestedCoffeeTime ? <Badge tone="sand">Coffee by {profile.latestSuggestedCoffeeTime}</Badge> : null}
        </View>
        <View style={styles.routeBox}>
          <Text style={styles.label}>FROM {route.originLabel.toUpperCase()}</Text>
          <Text style={styles.origin}>{route.origin}</Text>
          <Text style={styles.value}>{route.mode === 'walking' ? 'Walking' : route.mode === 'transit' ? 'Transit / train' : 'Driving'}: {rangeLabel(route.walking)}</Text>
          <Text style={styles.value}>Extra detour allowance: {rangeLabel(route.detour)}</Text>
          <Text style={styles.freshness}>Planning estimates, not live routing; exclude café time and queues. {route.changed ? 'Route changed or is outside the estimated route; recheck Directions.' : 'Check hills, steps, and the onward route in Directions.'}</Text>
          {route.note ? <Text style={styles.description}>{route.note}</Text> : null}
        </View>
        <Text style={styles.freshness}>
          {hasFreshOpenStatus ? `Opening status checked ${dated(metadataTimestamp(metadata))} · less than 15 minutes old; not a forecast for your trip.`
            : !isOnline ? 'Offline: saved recommendations remain usable. Open-now status is hidden; Maps needs connectivity.'
              : !googlePlacesConfigured ? 'Live Google Places is not configured. Check current hours, photos, and reviews in Maps.'
                : 'Opening status is unknown or older than 15 minutes. Refresh details or check Maps.'}
        </Text>
        <Text style={styles.freshness}>Orders and seating are curated suggestions, not verified current menus or availability.</Text>
        <View style={styles.actions}>
          <CoffeeAction label={isAdded ? 'Already in Day' : 'Add to Day'} icon={isAdded ? 'check' : 'plus'} primary={!isAdded} disabled={isAdded || !canEdit}
            onPress={() => mutate(onAdd, 'Added as an optional coffee stop. Existing stops were kept.')} />
          <CoffeeAction label="Replace Stop" icon="swap-horizontal" disabled={isAdded || !canEdit} selected={pickerOpen}
            onPress={() => { setPickerOpen(value => !value); setReplacementId(null); setFeedback(''); }} />
          <CoffeeAction label="Directions" icon="directions" onPress={() => void openLink(route.url)} />
          <CoffeeAction label={isSaved ? 'Saved as Backup' : 'Save as Backup'} icon={isSaved ? 'bookmark-check-outline' : 'bookmark-plus-outline'} disabled={isSaved || !canEdit}
            onPress={() => mutate(onSave, 'Saved as a backup only. The active itinerary is unchanged.')} />
          <CoffeeAction label="Check hours / photos" icon="google-maps" onPress={() => void openLink(profile.googleMapsUrl)} />
          {googlePlacesConfigured ? <CoffeeAction label={refreshing ? 'Refreshing…' : 'Refresh details'} icon="refresh" disabled={!isOnline || refreshing || !canEdit} onPress={() => void refresh()} /> : null}
        </View>
        {pickerOpen && !isAdded ? (
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Choose a stop to replace</Text>
            <Text style={styles.description}>Only unlocked, active stops from this day are listed. Nothing changes until you confirm; the original is kept as a backup.</Text>
            {replaceableStops.length ? replaceableStops.map(stop => (
              <Pressable key={stop.id} accessibilityRole="radio" accessibilityLabel={`${stop.timeBlock} ${stop.title}`} accessibilityState={{ checked: replacementId === stop.id }}
                onPress={() => setReplacementId(stop.id)} style={[styles.pickerOption, replacementId === stop.id && styles.selectedAction]}>
                <MaterialCommunityIcons name={replacementId === stop.id ? 'radiobox-marked' : 'radiobox-blank'} size={20} color={colors.forestDark} />
                <Text style={styles.pickerOptionText}>{stop.timeBlock} · {stop.title}</Text>
              </Pressable>
            )) : <Text style={styles.description}>No unlocked active stops to replace. Add coffee to the day or save it as a backup instead.</Text>}
            {selectedStop ? <Text style={styles.description}>Replace “{selectedStop.title}” with {profile.name} at {selectedStop.timeBlock}. Check travel time and café hours for that time.</Text> : null}
            <View style={styles.actions}>
              <CoffeeAction label="Confirm replacement" icon="swap-horizontal" primary disabled={!selectedStop || !canEdit} onPress={() => {
                if (!selectedStop) return;
                mutate(() => {
                  if (!onReplace(selectedStop.id)) throw new Error('Stop is no longer eligible');
                  setPickerOpen(false);
                  setReplacementId(null);
                }, 'Stop replaced by your choice. The original was kept as a backup.');
              }} />
              <CoffeeAction label="Cancel" icon="close" onPress={() => { setPickerOpen(false); setReplacementId(null); }} />
            </View>
          </View>
        ) : null}
        {feedback ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}
      </View>
    </View>
  );
}

export function CoffeeLayer({ dayId }: { dayId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now);
  const { trip, isOnline, isHydrated, storageError, addCoffeeStop, saveCoffeeBackup, replaceSegment, refreshPlaceMetadata } = useTrip();
  const canEdit = isHydrated && !storageError;
  const profiles = useMemo(() => coffeeStopsByDay(dayId), [dayId]);
  const metadata = useMemo(() => profiles.map(profile => metadataFor(profile, trip.placeMetadataCache)), [profiles, trip.placeMetadataCache]);

  // Expire opening assertions even if the user leaves this panel open. This
  // schedules a local clock update, never a network refresh or render-time fetch.
  useEffect(() => {
    if (!expanded) return;
    const current = Date.now();
    if (metadata.some(item => isOpenStatusFresh(item, now) !== isOpenStatusFresh(item, current))) setNow(current);
    const expirations = metadata.filter(item => isOnline && isOpenStatusFresh(item, current))
      .map(item => Date.parse(metadataTimestamp(item)!) + OPEN_STATUS_LIFETIME);
    const timeout = expirations.length ? setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(...expirations) - current + 1)) : undefined;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { if (timeout !== undefined) clearTimeout(timeout); subscription.remove(); };
  }, [expanded, isOnline, metadata, now]);

  const city = trip.cities.find(item => item.days.some(day => day.id === dayId));
  const day = city?.days.find(item => item.id === dayId);
  if (!profiles.length || !day || !city) return null;
  const active = day.segments.filter(isActiveStop);
  const replaceableStops = active.filter(segment => !segment.isLocked).sort((a, b) => a.orderIndex - b.orderIndex);
  const savedNames = [
    ...(day.backups ?? []).map(place => place.name),
    ...day.segments.filter(segment => segment.isBackup || segment.status === 'backup').map(segment => segment.title),
    ...day.segments.flatMap(segment => segment.alternatives.map(place => place.name))
  ];
  const cards = profiles.map((profile, index) => ({ profile, metadata: metadata[index], route: routeFor(profile, city, day, trip) }));
  // Prefer actually estimated short walks over longer / unverified detours.
  // Sorting does not mutate the curated data or any itinerary segment.
  const rank = (card: typeof cards[number]) => card.profile.preferred ? -1 : card.profile.routeRole === 'backup' ? 4
    : card.profile.routeRole === 'destination-detour' ? 3 : card.route.walking && card.route.walking[1] <= 10 ? 0 : 1;
  cards.sort((a, b) => rank(a) - rank(b));
  return (
    <View style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Need coffee nearby?" accessibilityState={{ expanded }}
        onPress={() => { setNow(Date.now()); setExpanded(value => !value); }} style={styles.trigger}>
        <View style={styles.triggerIcon}><MaterialCommunityIcons name="coffee-outline" size={22} color={colors.forestDark} /></View>
        <View style={styles.heading}>
          <Text style={styles.triggerTitle}>Need coffee nearby?</Text>
          <Text style={styles.triggerMeta}>{profiles.filter(profile => profile.morningRecommended).length} morning · {profiles.filter(profile => profile.afternoonRecommended).length} afternoon · optional layer</Text>
        </View>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.forestDark} />
      </Pressable>
      {expanded ? (
        <View style={styles.content}>
          <Text style={styles.rule}>Coffee is optional and additive. Prefer a 5–10 min walk from the Airbnb or previous stop; destination detours are choices, never automatic replacements.</Text>
          <Text style={styles.rule}>Morning 08:00–11:30 · afternoon preferably before 16:00. After 16:00 favor pastry, tea, or decaf. Suggested times are not verified opening hours.</Text>
          {!canEdit ? <Text style={styles.rule}>{storageError ?? 'Loading your saved itinerary before enabling changes…'}</Text> : null}
          {cards.map(({ profile, metadata: placeMetadata, route }) => {
            const isAdded = active.some(segment => matchesName(profile, segment.title));
            return <CoffeeCard key={`${dayId}-${profile.id}`} profile={profile} metadata={placeMetadata} route={route} now={now}
              isAdded={isAdded} isSaved={savedNames.some(name => matchesName(profile, name))} isOnline={isOnline} canEdit={canEdit} replaceableStops={replaceableStops}
              onAdd={() => {
                if (isAdded || !canEdit) return;
                // An earlier coffee entry may have been renamed / replaced.
                // Preserve it and allocate a new id instead of silently no-oping.
                let id = profile.id;
                let suffix = 1;
                while (day.segments.some(segment => segment.id === `coffee-${id}`)) id = `${profile.id}-${suffix++}`;
                const addition: CoffeeRecommendation = { ...profile, id, routeMode: route.mode };
                addCoffeeStop(addition);
              }}
              onSave={() => saveCoffeeBackup(dayId, profile)}
              onReplace={id => {
                const target = day.segments.find(segment => segment.id === id);
                if (!target || target.isLocked || !isActiveStop(target) || isAdded) return false;
                replaceSegment(id, toAlternative(profile, placeMetadata));
                return true;
              }}
              onRefresh={() => refreshPlaceMetadata(profile.googlePlaceQuery ?? `${profile.name} ${profile.city}`)} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { marginBottom: spacing.md },
  trigger: { backgroundColor: colors.lime, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  triggerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.55)', alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  triggerTitle: { color: colors.forestDark, fontSize: 16, fontWeight: '900' },
  triggerMeta: { color: colors.forestDark, fontSize: 11, marginTop: 3 },
  content: { gap: spacing.md, marginTop: spacing.md },
  rule: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', ...shadow },
  image: { width: '100%', height: 150 },
  attribution: { color: colors.muted, fontSize: 10, padding: spacing.sm },
  imagePlaceholder: { minHeight: 90, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  imageText: { color: colors.forestDark, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  body: { padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm },
  route: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: .6, textTransform: 'uppercase' },
  name: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  city: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rating: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  ratingText: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  ratingCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  recommendations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recommendation: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.canvas, borderRadius: radius.md, padding: spacing.md },
  label: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: .5 },
  value: { color: colors.ink, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  freshness: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  routeBox: { backgroundColor: colors.canvas, padding: spacing.md, borderRadius: radius.md, gap: 5 },
  origin: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { backgroundColor: colors.mint, borderRadius: radius.pill, minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: '100%' },
  primaryAction: { backgroundColor: colors.coral },
  selectedAction: { backgroundColor: colors.lime },
  disabledAction: { opacity: .55 },
  pressed: { opacity: .72 },
  actionText: { color: colors.forestDark, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  primaryText: { color: colors.white },
  picker: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  pickerTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  pickerOption: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.canvas, borderRadius: radius.sm },
  pickerOptionText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 18 },
  feedback: { color: colors.forestDark, fontSize: 12, lineHeight: 18, fontWeight: '700' }
});
