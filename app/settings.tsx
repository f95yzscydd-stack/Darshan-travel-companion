import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/src/components/Badge';
import { HomeBaseCard } from '@/src/components/HomeBaseCard';
import { StayCard } from '@/src/components/StayCard';
import { OfflineStatusBanner } from '@/src/components/OfflineStatusBanner';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { trip, resetTrip } = useTrip();
  const reset = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Reset all itinerary edits?')) resetTrip();
    } else {
      Alert.alert('Reset itinerary?', 'This restores the approved Lisbon, Porto and Mallorca plan, including all booked stays. Your itinerary edits will be removed.', [
        { text: 'Cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetTrip }
      ]);
    }
  };
  return (
    <Screen eyebrow="Your travel defaults" title="Trip settings">
      <OfflineStatusBanner />
      <View style={styles.baseHeading}>
        <Text style={styles.label}>BOOKED ACCOMMODATION</Text>
        <Text style={styles.title}>Your fixed home bases</Text>
        <Text style={styles.body}>Your booked bases anchor each day’s routes. Mallorca has three stays; nearby collections are optional recommendations, not scheduled stops.</Text>
      </View>
      {trip.cities.filter(city => city.homeBase).map(city => <HomeBaseCard key={city.id} city={city} />)}
      {trip.cities.filter(city => !city.homeBase).flatMap(city => city.stays.map(stay => <StayCard key={stay.id} stay={stay} />))}
      <View style={styles.card}>
        <Text style={styles.label}>DIETARY</Text>
        <View style={styles.row}><Text style={styles.title}>Prefer minimal pork</Text><Badge tone="lime">Flexible</Badge></View>
        <Text style={styles.body}>Seafood welcome; chicken preferred when practical. Traditional pastries, croissants and laminated pastries. Coffee morning and afternoon, preferably before 16:00; aim for a 5–10 minute detour.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>GETTING AROUND</Text>
        {trip.preferences.transport.map(item => <Text key={item} style={styles.item}>• {item}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>SYNC STATUS</Text>
        <View style={styles.row}><Text style={styles.title}>Local-first data</Text><Badge tone="mint">{trip.syncStatus}</Badge></View>
        <Text style={styles.body}>Every model includes sync status and timestamps, ready for a future account-backed sync engine.</Text>
      </View>
      <Pressable onPress={reset} style={styles.reset}><Text style={styles.resetText}>Reset to approved itinerary</Text></Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  baseHeading: { gap: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  label: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  item: { color: colors.ink, fontSize: 14, lineHeight: 22, textTransform: 'capitalize' },
  reset: { borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.pill, padding: spacing.lg, alignItems: 'center' },
  resetText: { color: colors.danger, fontWeight: '800' }
});
