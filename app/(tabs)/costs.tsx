import { StyleSheet, Text, View } from 'react-native';
import { CostSummaryCard } from '@/src/components/CostSummaryCard';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';

const categories = ['food', 'drinks', 'attractions', 'transport', 'hotel', 'miscellaneous'];
const toEur = (amount: number, currency: 'EUR' | 'CAD') =>
  currency === 'CAD' ? amount / 1.57 : amount;
const categoryFor = (category: string) => {
  if (['breakfast', 'lunch', 'dinner', 'petiscos', 'seafood', 'piri-piri chicken', 'dessert', 'pastel de nata', 'food market'].some(type => category.includes(type))) return 'food';
  if (category.includes('cocktail') || category.includes('wine') || category.includes('tasting')) return 'drinks';
  if (['attraction', 'sight', 'architecture', 'historic town'].some(type => category.includes(type))) return 'attractions';
  if (['transport', 'rental', 'flight', 'boat', 'transit'].includes(category)) return 'transport';
  if (['hotel', 'stay', 'checkin', 'checkout', 'accommodation'].includes(category)) return 'hotel';
  return 'miscellaneous';
};

export default function CostsScreen() {
  const { trip } = useTrip();
  const allDays = trip.cities.flatMap(city => city.days);
  const segments = allDays.flatMap(day => day.segments);
  const estimated = segments.reduce((sum, item) => sum + toEur(item.estimatedCost, item.currency), 0);
  const actual = segments.reduce((sum, item) => sum + toEur(item.actualCost ?? 0, item.currency), 0);
  return (
    <Screen eyebrow="Lightweight tracking" title="Trip costs">
      <CostSummaryCard estimated={estimated} actual={actual} />
      <Text style={styles.note}>EUR is the source currency · CAD preview uses a planning rate of 1 EUR = 1.57 CAD.</Text>
      {segments.some(s => s.costUnknown) ? <Text style={styles.note}>Partial estimate: Mallorca has unpriced meals, stays and activities. Hertz is counted once (€231.30); the primary boat plan includes two adult return tickets (€70).</Text> : null}
      <Text style={styles.heading}>By category</Text>
      {categories.map(category => {
        const amount = segments.filter(item => categoryFor(item.category) === category).reduce((sum, item) => sum + toEur(item.estimatedCost, item.currency), 0);
        const percentage = estimated ? amount / estimated * 100 : 0;
        return (
          <View key={category} style={styles.category}>
            <View style={styles.categoryTop}>
              <Text style={styles.categoryName}>{category}</Text>
              <Text style={styles.categoryAmount}>€{amount.toFixed(0)}</Text>
            </View>
            <View style={styles.bar}><View style={[styles.fill, { width: `${percentage}%` }]} /></View>
          </View>
        );
      })}
      <Text style={styles.heading}>By day</Text>
      {allDays.map((day, index) => {
        const city = trip.cities.find(item => item.days.some(cityDay => cityDay.id === day.id));
        return (
        <View key={day.id} style={styles.day}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.dayName}>Day {index + 1} · {city?.city}</Text>
            <Text style={styles.dayTheme}>{day.theme}</Text>
          </View>
          <Text style={styles.dayAmount}>€{day.segments.reduce((sum, item) => sum + toEur(item.estimatedCost, item.currency), 0).toFixed(0)}</Text>
        </View>
      )})}
    </Screen>
  );
}
const styles = StyleSheet.create({
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  category: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { color: colors.ink, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' },
  categoryAmount: { color: colors.forest, fontSize: 15, fontWeight: '900' },
  bar: { height: 7, backgroundColor: colors.line, borderRadius: 4, marginTop: spacing.md, overflow: 'hidden' },
  fill: { height: 7, backgroundColor: colors.coral, borderRadius: 4 },
  day: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  dayTheme: { color: colors.muted, fontSize: 11, marginTop: 3 },
  dayAmount: { color: colors.forestDark, fontSize: 20, fontWeight: '900' }
});
