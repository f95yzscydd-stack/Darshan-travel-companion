import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTrip } from '@/src/context/TripContext';
import { ItinerarySegment } from '@/src/types/models';
import { hasPorkRisk } from '@/src/utils/dietary';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';
import { CostBadge, DietaryWarningBadge, PriorityBadge, ReservationBadge, ValidationBadge } from './Badges';
import { GoogleMapsButton } from './GoogleMapsButton';
import { GoogleRatingInline } from './GoogleReviewSummary';
import { ReorderControls } from './ReorderControls';
import { Badge } from './Badge';
import { routeDisplay } from '@/src/utils/routes';

export function SegmentCard({ segment, dayId, isLast }: { segment: ItinerarySegment; dayId: string; isLast?: boolean }) {
  const { toggleComplete, moveSegment, isOnline } = useTrip();
  const porkRisk = hasPorkRisk(segment.description, segment.recommendedDishes, segment.dietaryNotes);
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <Pressable onPress={() => toggleComplete(segment.id)} style={[styles.dot, segment.isCompleted && styles.dotDone]}>
          {segment.isCompleted ? <MaterialCommunityIcons name="check" size={13} color={colors.white} /> : null}
        </Pressable>
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={[styles.card, segment.isCompleted && { opacity: 0.62 }]}>
        <View style={styles.topline}>
          <Text style={styles.time}>{segment.timeBlock}</Text>
          <View style={styles.topActions}>
            {segment.isLocked && <MaterialCommunityIcons name="lock" size={14} color={colors.gold} />}
            <ReorderControls
              label={segment.title}
              disabled={segment.isLocked}
              onUp={() => moveSegment(dayId, segment.id, -1)}
              onDown={() => moveSegment(dayId, segment.id, 1)}
            />
          </View>
        </View>
        <Pressable onPress={() => router.push(`/place/${segment.id}`)}>
          <Text style={styles.category}>{segment.category}</Text>
          <Text style={styles.title}>{segment.title}</Text>
          <GoogleRatingInline metadata={segment.googlePlaceMetadata} />
          <Text style={styles.description}>{segment.description}</Text>
        </Pressable>
        {segment.recommendedDishes.length > 0 && (
          <Text style={styles.dishes}><Text style={styles.dishesLabel}>ORDER  </Text>{segment.recommendedDishes.join(' · ')}</Text>
        )}
        <View style={styles.badges}>
          <PriorityBadge priority={segment.priority} />
          <ValidationBadge status={segment.validationStatus} />
          {segment.reservationRecommended && <ReservationBadge />}
          {porkRisk && <DietaryWarningBadge />}
          {segment.costUnknown && segment.actualCost === undefined ? <Badge tone="sand">Cost not estimated</Badge> : segment.category === 'accommodation' && !segment.estimatedCost && segment.actualCost === undefined
            ? <Badge tone="sky">Stay cost not entered</Badge>
            : <CostBadge amount={segment.actualCost ?? segment.estimatedCost} currency={segment.currency} />}
        </View>
        <View style={styles.footer}>
          {segment.routeFromPrevious
            ? <Text style={styles.transport}>{segment.routeKind === 'boat' ? 'Boat' : segment.routeFromPrevious.mode} · {routeDisplay(segment.routeFromPrevious, isOnline)}</Text>
            : <View />}
          <View style={styles.mapActions}>
            <GoogleMapsButton compact url={segment.googleMapsUrl} action="photos" />
            <GoogleMapsButton compact url={segment.routeFromPrevious?.directionsUrl ?? segment.googleMapsUrl} action="directions" />
          </View>
        </View>
        {segment.costBasis ? <Text style={styles.transport}>{segment.costBasis}</Text> : null}
        {segment.alternatives.length ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/pivot', params: { segmentId: segment.id } })}><Text style={styles.dishes}>Primary plan · View restaurant / coffee backups →</Text></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rail: { width: 22, alignItems: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.forest, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', marginTop: 18, zIndex: 2 },
  dotDone: { backgroundColor: colors.forest },
  line: { width: 2, backgroundColor: '#D5D9D3', flex: 1, marginTop: -1, marginBottom: -20 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadow },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  time: { color: colors.coral, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  category: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 3 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  dishes: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  dishesLabel: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  mapActions: { flexDirection: 'row', gap: 6 },
  transport: { flexShrink: 1, color: colors.muted, fontSize: 11, fontWeight: '700' }
});
