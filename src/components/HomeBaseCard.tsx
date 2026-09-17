import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/src/components/Badge';
import { GoogleReviewSummary } from '@/src/components/GoogleReviewSummary';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';
import { AlternativePlace, CityPlan } from '@/src/types/models';
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from '@/src/utils/maps';

const stayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', {
  month: 'short', day: 'numeric', year: 'numeric'
});

function MapAction({ label, url, icon, primary = false }: {
  label: string;
  url: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  primary?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const open = async () => {
    setFailed(false);
    try {
      await Linking.openURL(url);
    } catch {
      setFailed(true);
    }
  };
  return (
    <View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() => void open()}
        style={({ pressed }) => [styles.action, primary && styles.primaryAction, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name={icon} size={16} color={primary ? colors.white : colors.forestDark} />
        <Text style={[styles.actionText, primary && styles.primaryActionText]}>{label}</Text>
      </Pressable>
      {failed ? <Text accessibilityRole="alert" style={styles.error}>Could not open Maps. Try again.</Text> : null}
    </View>
  );
}

function NearbyPlaceCard({ place, city, origin }: { place: AlternativePlace; city: string; origin: string }) {
  const { trip, isOnline, refreshPlaceMetadata } = useTrip();
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const query = `${place.name} ${city}`;
  const metadata = trip.placeMetadataCache?.[query] ?? place.metadata;
  const mapsUrl = metadata?.googlePlaceId
    ? googleMapsPlaceUrl(query, metadata.googlePlaceId)
    : place.googleMapsUrl ?? googleMapsPlaceUrl(query);
  // Preserve branch-specific and grocery-search queries supplied by the collection.
  const destination = place.address ? `${place.name}, ${place.address}, ${city}` : new URL(mapsUrl).searchParams.get('query') ?? query;
  const directionsUrl = new URL(googleMapsDirectionsUrl(origin, destination, 'walking'));
  if (metadata?.googlePlaceId) directionsUrl.searchParams.set('destination_place_id', metadata.googlePlaceId);
  const lastUpdated = metadata?.lastUpdated ?? metadata?.fetchedAt;

  const refresh = async () => {
    if (refreshing || !isOnline) return;
    setRefreshing(true);
    setFeedback(null);
    try {
      const result = await refreshPlaceMetadata(query);
      setFeedback(result ? 'Google details refreshed and saved for offline reference.' : 'Live details unavailable. Open Maps for current information.');
    } catch {
      setFeedback('Could not refresh. Saved details are still available; try again when connected.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.place}>
      <Text style={styles.placeCategory}>{place.category}</Text>
      <Text style={styles.placeName}>{place.name}</Text>
      {place.description ? <Text style={styles.body}>{place.description}</Text> : null}
      {place.address ? <Text selectable style={styles.caption}>{place.address}</Text> : null}
      {place.distanceLabel ? <Text style={styles.caption}>{place.distanceLabel}</Text> : null}
      {place.recommendedDishes?.length ? <Text style={styles.body}>Try: {place.recommendedDishes.join(' · ')}</Text> : null}
      {metadata?.photoUrl ? (
        <View style={styles.photoFrame}>
          <Image accessibilityLabel={`Photo of ${place.name}`} source={{ uri: metadata.photoUrl }} style={styles.photo} resizeMode="cover" />
          {metadata.photoAttribution ? <Text style={styles.caption}>{metadata.photoAttribution}</Text> : null}
        </View>
      ) : null}
      <GoogleReviewSummary metadata={metadata} />
      {lastUpdated ? (
        <Text style={styles.caption}>
          Google snapshot · last updated {new Date(lastUpdated).toLocaleString('en-CA')}
          {metadata?.openNow === true ? ' · Open at last check' : metadata?.openNow === false ? ' · Closed at last check' : ''}
        </Text>
      ) : <Text style={styles.caption}>No dated Google details saved. Check Maps for current photos, reviews and hours.</Text>}
      <View style={styles.actions}>
        <MapAction label="Maps" icon="map-marker-outline" url={mapsUrl} />
        <MapAction label="Photos & reviews" icon="image-multiple-outline" url={mapsUrl} />
        <MapAction label="Directions from Airbnb" icon="directions" url={directionsUrl.toString()} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Refresh Google details for ${place.name}`}
        accessibilityState={{ disabled: !isOnline || refreshing, busy: refreshing }}
        disabled={!isOnline || refreshing}
        onPress={() => void refresh()}
        style={({ pressed }) => [styles.refresh, (!isOnline || refreshing) && styles.disabled, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="refresh" size={15} color={colors.forest} />
        <Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : isOnline ? 'Refresh Google details' : 'Offline · using saved details'}</Text>
      </Pressable>
      {feedback ? <Text accessibilityLiveRegion="polite" style={styles.caption}>{feedback}</Text> : null}
    </View>
  );
}

export function HomeBaseCard({ city }: { city: CityPlan }) {
  const [expanded, setExpanded] = useState(false);
  const base = city.homeBase;
  if (!base) return null;
  const nearby = city.nearbyPlaces ?? [];
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.homeIcon}><MaterialCommunityIcons name="home-outline" size={25} color={colors.forestDark} /></View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>BOOKED HOME BASE</Text>
          <Text style={styles.title}>{city.city} · {base.type}</Text>
        </View>
        <Badge tone="lime">Booked · locked</Badge>
      </View>
      <Text selectable style={styles.address}>{base.address}</Text>
      <Text style={styles.neighborhood}>{base.neighborhood}</Text>
      <View style={styles.dates}>
        <MaterialCommunityIcons name="calendar-range" size={18} color={colors.forest} />
        <Text style={styles.dateText}>{stayDate(base.startDate)} – {stayDate(base.endDate)}</Text>
      </View>
      <View style={styles.stayDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>CHECK-IN</Text>
          <Text style={styles.body}>{base.checkIn ?? 'Confirm arrival details with host'}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>CHECK-OUT</Text>
          <Text style={styles.body}>{base.checkOut ?? 'Confirm checkout time with host'}</Text>
        </View>
      </View>
      {base.baggageDrop || base.baggageBackups?.length ? (
        <View style={styles.baggage}>
          <Text style={styles.detailLabel}>BAGGAGE PLAN</Text>
          {base.baggageDrop ? <Text style={styles.body}>{base.baggageDrop}</Text> : null}
          {base.baggageBackups?.length ? (
            <View style={styles.notes}>
              <Text style={styles.caption}>Backup options</Text>
              {base.baggageBackups.map((backup, index) => <Text key={backup} style={styles.body}>{index + 1}. {backup}</Text>)}
            </View>
          ) : null}
        </View>
      ) : null}
      {base.notes?.length ? (
        <View style={styles.notes}>{base.notes.map(note => <Text key={note} style={styles.body}>• {note}</Text>)}</View>
      ) : null}
      <View style={styles.actions}>
        <MapAction primary label="Directions to Airbnb" icon="directions" url={googleMapsDirectionsUrl(undefined, base.address)} />
      </View>
      <View style={styles.collection}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Around the Airbnb in ${city.city}, ${nearby.length} recommendations`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(current => !current)}
          style={({ pressed }) => [styles.collectionToggle, pressed && styles.pressed]}
        >
          <View style={styles.heading}>
            <Text style={styles.collectionTitle}>Around the Airbnb</Text>
            <Text style={styles.caption}>{nearby.length} nearby ideas · recommendations, not itinerary stops</Text>
          </View>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={colors.forestDark} />
        </Pressable>
        {expanded ? (
          <View style={styles.collectionBody}>
            <Text style={styles.caption}>Explore when it suits you. Directions start at this Airbnb; opening this collection does not change your days. Google details are cached snapshots, not a guarantee of current hours.</Text>
            {nearby.length > 0 ? nearby.map(place => <NearbyPlaceCard key={place.id} place={place} city={city.city} origin={base.address} />) : <Text style={styles.body}>No nearby recommendations saved yet.</Text>}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  homeIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 145 },
  eyebrow: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  address: { color: colors.ink, fontSize: 17, fontWeight: '800', lineHeight: 24 },
  neighborhood: { color: colors.forest, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  dates: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateText: { flex: 1, color: colors.forestDark, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  stayDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detail: { flex: 1, minWidth: 160, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.canvas, gap: spacing.xs },
  detailLabel: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  body: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  baggage: { backgroundColor: colors.sand, borderRadius: radius.sm, padding: spacing.md, gap: spacing.sm },
  notes: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.mint, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryAction: { backgroundColor: colors.forest },
  actionText: { color: colors.forestDark, fontSize: 11, fontWeight: '800' },
  primaryActionText: { color: colors.white },
  pressed: { opacity: .72 },
  collection: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.xs },
  collectionToggle: { minHeight: 66, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  collectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  collectionBody: { gap: spacing.md, paddingTop: spacing.md },
  place: { backgroundColor: colors.canvas, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  placeCategory: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: .8, textTransform: 'uppercase' },
  placeName: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  photoFrame: { gap: spacing.xs },
  photo: { width: '100%', height: 180, borderRadius: radius.sm },
  refresh: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  refreshText: { color: colors.forest, fontSize: 11, fontWeight: '800' },
  disabled: { opacity: .55 },
  error: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: spacing.xs }
});
