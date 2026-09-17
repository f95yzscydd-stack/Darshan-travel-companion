import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/src/theme/tokens';

export function CostSummaryCard({ estimated, actual = 0 }: { estimated: number; actual?: number }) {
  const cadRate = 1.57;
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.label}>TRIP ESTIMATE</Text>
        <Text style={styles.amount}>€{estimated.toFixed(0)}</Text>
        <Text style={styles.cad}>≈ C${(estimated * cadRate).toFixed(0)}</Text>
      </View>
      <View style={styles.divider} />
      <View>
        <Text style={styles.label}>ACTUAL SO FAR</Text>
        <Text style={styles.actual}>€{actual.toFixed(0)}</Text>
        <Text style={styles.cad}>{actual ? `${Math.round(actual / estimated * 100)}% of plan` : 'Add as you go'}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.forestDark, borderRadius: radius.lg, padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'stretch' },
  label: { color: '#AFC6BA', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  amount: { color: colors.lime, fontSize: 34, fontWeight: '800', marginTop: 5 },
  actual: { color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 5 },
  cad: { color: '#C6D7CE', fontSize: 11, marginTop: 2 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }
});
