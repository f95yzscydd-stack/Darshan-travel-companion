import { StyleSheet, Text, View } from 'react-native';
import { AlternativePlace } from '@/src/types/models';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';
import { Badge } from './Badge';
import { GoogleMapsButton } from './GoogleMapsButton';
import { GoogleRatingInline } from './GoogleReviewSummary';

export function PlaceCard({ place, action }: { place: AlternativePlace; action?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{place.category}</Text>
          <Text style={styles.title}>{place.name}</Text>
          <GoogleRatingInline metadata={place.metadata} />
        </View>
        {place.curated && <Badge tone="lime">Curated</Badge>}
      </View>
      {place.description ? <Text style={styles.body}>{place.description}</Text> : null}
      <View style={styles.meta}>
        {place.status === 'backup' ? <Badge tone="sky">Saved backup</Badge> : null}
        {place.unavailableOnPlannedDate ? <Badge tone="sand">Unavailable on planned date</Badge> : null}
        {place.takeawayFocused ? <Badge tone="mint">Takeaway focused</Badge> : null}
        {place.vibe ? <Badge tone="mint">{place.vibe}</Badge> : null}
        {place.distanceLabel ? <Badge tone="sky">{place.distanceLabel}</Badge> : null}
        {place.estimatedCost ? <Badge tone="sand">≈ €{place.estimatedCost}</Badge> : null}
      </View>
      {place.reason ? <Text style={styles.body}>{place.reason}</Text> : null}
      <View style={styles.actions}>
        {place.googleMapsUrl ? (
          <View style={styles.mapActions}>
            <GoogleMapsButton compact url={place.googleMapsUrl} action="photos" />
            <GoogleMapsButton compact url={place.googleMapsUrl} />
          </View>
        ) : <View />}
        {action}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md, ...shadow },
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  category: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 3 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  mapActions: { flexDirection: 'row', gap: 6 }
});
