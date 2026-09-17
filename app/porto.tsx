import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/src/components/Badge';
import { HomeBaseCard } from '@/src/components/HomeBaseCard';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';

export default function PortoScreen() {
  const { trip } = useTrip();
  const porto = trip.cities.find(city => city.id === 'porto');
  if (!porto) return <Screen title="Porto"><Text>The Porto plan is unavailable.</Text></Screen>;
  return (
    <Screen eyebrow="September 22–25 · 3 nights" title="Porto, by the river.">
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.circle}><MaterialCommunityIcons name="bridge" size={42} color={colors.lime} /></View>
          <Badge tone="lime">Airbnb booked</Badge>
        </View>
        <Text style={styles.heroTitle}>Douro light,{'\n'}Atlantic air.</Text>
        <Text style={styles.heroBody}>River views, Gaia Port wine, northern seafood, rugged coast, architecture, and photography.</Text>
      </View>
      <HomeBaseCard city={porto} />
      <View style={styles.arrival}>
        <View style={styles.arrivalHeading}>
          <MaterialCommunityIcons name="car-key" size={24} color={colors.forestDark} />
          <Text style={styles.arrivalTitle}>September 22 · SIXT arrival</Text>
          <Badge tone="lime">Locked</Badge>
        </View>
        <Text style={styles.decisionText}>Lisbon Airport → Óbidos → Nazaré → Porto Airport</Text>
        <Text style={styles.arrivalBody}>Pickup at Lisbon Airport SIXT any time after 09:00; target 09:15–10:00. Automatic compact crossover/SUV for 2 adults and 2 checked-size suitcases.</Text>
        <Text style={styles.arrivalBody}>Allow 1.5–2 hours in Óbidos and 3+ hours in Nazaré, including lunch and coffee. Keep a buffer for refueling and the rental return.</Text>
        <Text style={styles.arrivalBody}>Return to Porto Airport SIXT around 21:00–22:00. Contractual deadline: 23:30 the same day.</Text>
        <View style={styles.transfer}>
          <Text style={styles.detailLabel}>AFTER RETURN</Text>
          <Text style={styles.arrivalBody}>SIXT airport shuttle → Uber to {porto.homeBase?.address ?? 'your booked Porto Airbnb'} → self check-in.</Text>
        </View>
      </View>
      <View style={styles.decision}>
        <Text style={styles.label}>LOCKED TRIP SHAPE</Text>
        <Text style={styles.decisionText}>Óbidos + Nazaré road trip → historic Porto + Gaia → Foz + Matosinhos coast</Text>
        <Text style={styles.decisionNote}>Douro Valley is an optional full-day swap, not part of the primary itinerary.</Text>
      </View>
      <Text style={styles.sectionTitle}>Your Porto chapter</Text>
      {porto.days.map((day, index) => (
        <Pressable key={day.id} onPress={() => router.push(`/day/${day.id}`)} style={styles.day}>
          <View style={styles.dayNumber}><Text style={styles.dayNumberText}>0{index + 1}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.dayTitle}>{day.title}</Text>
            <Text style={styles.dayTheme}>{day.theme}</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.forest} />
        </Pressable>
      ))}
      <View style={styles.flight}>
        <MaterialCommunityIcons name="airplane-takeoff" size={28} color={colors.white} />
        <View style={{ flex: 1 }}>
          <Text style={styles.flightLabel}>SEPTEMBER 25 · LOCKED DEPARTURE</Text>
          <Text style={styles.flightTitle}>08:00 flight · OPO → PMI</Text>
          <Text style={styles.flightMeta}>Porto → Palma de Mallorca. Target Uber departure: 05:10 from {porto.homeBase?.address ?? 'your booked Porto Airbnb'}.</Text>
          <Text style={styles.flightMeta}>Buy a grab-and-go breakfast ahead and keep it in the Airbnb kitchen for the early start.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.forestDark, borderRadius: 28, padding: spacing.xl, gap: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.white, fontSize: 38, lineHeight: 39, fontWeight: '900', letterSpacing: -1.3 },
  heroBody: { color: '#C6D7CE', fontSize: 14, lineHeight: 21 },
  arrival: { backgroundColor: colors.mint, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  arrivalHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  arrivalTitle: { flex: 1, minWidth: 170, color: colors.forestDark, fontSize: 17, fontWeight: '900' },
  arrivalBody: { color: colors.forestDark, fontSize: 13, lineHeight: 20 },
  transfer: { borderTopWidth: 1, borderTopColor: colors.forest, paddingTop: spacing.md, gap: spacing.xs },
  detailLabel: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  decision: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  decisionText: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '800', marginTop: spacing.sm },
  decisionNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  day: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center', ...shadow },
  dayNumber: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
  dayNumberText: { color: colors.forestDark, fontWeight: '900' },
  date: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: .8, textTransform: 'uppercase' },
  dayTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 3 },
  dayTheme: { color: colors.muted, fontSize: 11, marginTop: 3 },
  flight: { backgroundColor: colors.forestDark, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flightLabel: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  flightTitle: { color: colors.white, fontSize: 15, fontWeight: '900', marginTop: 3 },
  flightMeta: { color: colors.mint, fontSize: 12, lineHeight: 18, marginTop: spacing.sm }
});
