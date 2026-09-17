import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';

export default function ItineraryScreen() {
  const { trip } = useTrip();
  let globalDayNumber = 0;
  return (
    <Screen eyebrow="Portugal + Spain" title="Your days, in order">
      <Text style={styles.intro}>Lisbon’s neighborhoods, Porto’s river and Mallorca’s coast. September 25 connects both legs.</Text>
      {trip.cities.filter(city => city.days.length > 0).map(city => (
        <View key={city.id} style={styles.citySection}>
          <View style={styles.cityHeading}>
            <Text style={styles.cityName}>{city.city}</Text>
            <Text style={styles.cityMeta}>{city.nights} nights · {city.startDate?.slice(5).replace('-', '/')}–{city.endDate?.slice(5).replace('-', '/')}</Text>
          </View>
          {city.days.map(day => {
            globalDayNumber += 1;
            const completed = day.segments.filter(segment => segment.isCompleted).length;
            return (
              <Pressable key={day.id} onPress={() => router.push(`/day/${day.id}`)} style={styles.day}>
                <View style={[styles.number, city.id === 'porto' && styles.numberPorto]}><Text style={styles.numberText}>{globalDayNumber}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                  <Text style={styles.title}>{day.title}</Text>
                  <Text style={styles.theme}>{day.theme}</Text>
                  <View style={styles.progress}><View style={[styles.progressFill, { width: `${day.segments.length ? completed / day.segments.length * 100 : 0}%` }]} /></View>
                  <Text style={styles.count}>{completed}/{day.segments.length} complete</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: -8 },
  citySection: { gap: spacing.md },
  cityHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: spacing.sm },
  cityName: { color: colors.forestDark, fontSize: 21, fontWeight: '900' },
  cityMeta: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  day: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center', ...shadow },
  number: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  numberPorto: { backgroundColor: colors.sky },
  numberText: { color: colors.forestDark, fontSize: 20, fontWeight: '900' },
  date: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: .8, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 3 },
  theme: { color: colors.muted, fontSize: 12, marginTop: 3 },
  progress: { height: 4, backgroundColor: colors.line, borderRadius: 2, marginTop: spacing.md, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.forest },
  count: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 5 },
  arrow: { color: colors.forest, fontSize: 21, fontWeight: '800' }
});
