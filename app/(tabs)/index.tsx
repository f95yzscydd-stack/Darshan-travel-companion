import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CostSummaryCard } from '@/src/components/CostSummaryCard';
import { HomeBaseCard } from '@/src/components/HomeBaseCard';
import { OfflineStatusBanner } from '@/src/components/OfflineStatusBanner';
import { Screen } from '@/src/components/Screen';
import { TripHeader } from '@/src/components/TripHeader';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';

const toEur = (amount: number, currency: 'EUR' | 'CAD') =>
  currency === 'CAD' ? amount / 1.57 : amount;

export default function Dashboard() {
  const { trip } = useTrip();
  const days = trip.cities.flatMap(city => city.days);
  const allSegments = days.flatMap(day => day.segments);
  const next = allSegments.find(segment => !segment.isCompleted);
  const reservation = allSegments.find(segment => segment.reservationRecommended && !segment.isCompleted);
  const nextDay = days.find(day => day.segments.some(segment => !segment.isCompleted)) ?? days[0];
  const nextCity = trip.cities.find(city => city.days.some(day => day.segments.some(segment => segment.id === next?.id)));
  const reservationCity = trip.cities.find(city => city.days.some(day => day.segments.some(segment => segment.id === reservation?.id)));
  const actions = [
    { label: 'Next day', icon: 'calendar-today' as const, route: `/day/${nextDay?.id ?? 'day-1'}`, color: colors.lime },
    { label: 'Map', icon: 'map-outline' as const, route: '/map', color: colors.sky },
    { label: 'Food trail', icon: 'silverware-fork-knife' as const, route: '/food', color: colors.blush },
    { label: 'Alternatives', icon: 'shuffle-variant' as const, route: '/pivot', color: colors.sand }
  ] as const;
  const estimated = allSegments.reduce((sum, segment) => sum + toEur(segment.estimatedCost, segment.currency), 0);
  const actual = allSegments.reduce((sum, segment) => sum + toEur(segment.actualCost ?? 0, segment.currency), 0);
  return (
    <Screen>
      <TripHeader />
      <OfflineStatusBanner />
      <View style={styles.actions}>
        {actions.map(action => (
          <Pressable key={action.label} onPress={() => router.push(action.route)} style={({ pressed }) => [styles.action, pressed && { opacity: .7 }]}>
            <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
              <MaterialCommunityIcons name={action.icon} size={23} color={colors.forestDark} />
            </View>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>ON DECK</Text>
          <Text style={styles.sectionTitle}>Your next moments</Text>
        </View>
        <Pressable onPress={() => router.push('/itinerary')}><Text style={styles.link}>All days →</Text></Pressable>
      </View>
      <View style={styles.momentRow}>
        <Pressable onPress={() => next && router.push(`/place/${next.id}`)} style={[styles.moment, styles.momentDark]}>
          <Text style={styles.momentLabel}>NEXT STOP · {next?.timeBlock}</Text>
          <Text style={[styles.momentTitle, { color: colors.white }]}>{next?.title}</Text>
          <Text style={styles.momentMeta}>{nextCity?.city} · {next?.category} · Tap for details</Text>
        </Pressable>
        <Pressable onPress={() => reservation && router.push(`/place/${reservation.id}`)} style={styles.moment}>
          <MaterialCommunityIcons name="bookmark-check-outline" size={24} color={colors.coral} />
          <Text style={styles.momentLabel}>NEXT RESERVATION</Text>
          <Text style={styles.momentTitle}>{reservation?.title}</Text>
          <Text style={[styles.momentMeta, { color: colors.muted }]}>{reservationCity?.city} · {reservation?.date.slice(5).replace('-', '/')} · {reservation?.timeBlock}</Text>
        </Pressable>
      </View>
      <CostSummaryCard estimated={estimated} actual={actual} />
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>BOOKED & FIXED</Text>
          <Text style={styles.sectionTitle}>Your home bases</Text>
        </View>
      </View>
      {trip.cities.filter(city => city.homeBase).map(city => <HomeBaseCard key={city.id} city={city} />)}
      <Pressable onPress={() => router.push('/porto')} style={styles.porto}>
        <View style={styles.portoCopy}>
          <Text style={styles.eyebrow}>CHAPTER TWO · 3 NIGHTS</Text>
          <Text style={styles.portoTitle}>Porto, from your Airbnb.</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={24} color={colors.forestDark} />
      </Pressable>
      <Pressable onPress={() => router.push('/settings')}><Text style={styles.settings}>Trip settings</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/mallorca')} style={styles.porto}>
        <View style={styles.portoCopy}><Text style={styles.eyebrow}>CHAPTER THREE · SPAIN · 7 NIGHTS</Text><Text style={styles.portoTitle}>Mallorca, three coastal bases.</Text></View>
        <MaterialCommunityIcons name="arrow-right" size={24} color={colors.forestDark} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flex: 1, minWidth: 75, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 8, ...shadow },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.sm },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 3 },
  link: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  momentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  moment: { flex: 1, minWidth: 230, minHeight: 150, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, justifyContent: 'space-between', ...shadow },
  momentDark: { backgroundColor: colors.forest },
  momentLabel: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  momentTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  momentMeta: { color: '#BFD2C8', fontSize: 11, fontWeight: '600' },
  porto: { backgroundColor: colors.lime, borderRadius: radius.lg, padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  portoCopy: { flex: 1 },
  portoTitle: { color: colors.forestDark, fontSize: 21, fontWeight: '800', marginTop: 4 },
  settings: { textAlign: 'center', color: colors.muted, fontWeight: '700', paddingVertical: spacing.sm }
});
