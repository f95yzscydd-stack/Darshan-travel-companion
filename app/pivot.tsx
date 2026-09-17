import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PivotAlternativesSheet } from '@/src/components/PivotAlternativesSheet';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';

const filters = ['Curated backups', 'Check hours in Maps', 'Prefer minimal pork'];

export default function PivotScreen() {
  const { segmentId } = useLocalSearchParams<{ segmentId?: string }>();
  const { trip, replaceSegment } = useTrip();
  const segments = trip.cities.flatMap(city => city.days).flatMap(day => day.segments);
  const selected = segments.find(item => item.id === segmentId) ?? segments.find(item => item.alternatives.length > 0);
  const allAlternatives = segments.flatMap(item => item.alternatives);
  const alternatives = selected?.alternatives.length ? selected.alternatives : allAlternatives;
  return (
    <Screen eyebrow="Plan B, without the panic" title="Pivot mode">
      <Text style={styles.intro}>
        {selected ? `Swap ${selected.title} while keeping it tucked away as a backup.` : 'Choose a curated alternative and keep moving.'}
      </Text>
      <View style={styles.filters}>
        {filters.map((filter, index) => (
          <View key={filter} style={[styles.filter, index === 4 && styles.filterActive]}>
            <Text style={[styles.filterText, index === 4 && styles.filterTextActive]}>{filter}</Text>
          </View>
        ))}
      </View>
      {selected && alternatives.length > 0 ? (
        <PivotAlternativesSheet
          locked={selected.isLocked}
          alternatives={alternatives}
          onSelect={replacement => {
            replaceSegment(selected.id, replacement);
            if (router.canGoBack()) router.back();
            else router.replace(`/place/${selected.id}`);
          }}
        />
      ) : (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No curated pivots yet</Text><Text style={styles.emptyText}>Live nearby results will plug into the Google Places adapter later.</Text></View>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: -8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.forest },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: colors.white },
  empty: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm }
});
