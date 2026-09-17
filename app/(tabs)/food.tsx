import { FoodTrailGroup } from '@/src/components/FoodTrailGroup';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { NO_PORK_MESSAGE } from '@/src/utils/dietary';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/src/theme/tokens';

const groups = [
  { title: 'Pastel de nata', icon: 'cupcake' as const, match: ['pastel de nata'] },
  { title: 'Petiscos + markets', icon: 'food-variant' as const, match: ['petiscos', 'food market', 'market'] },
  { title: 'Piri-piri chicken', icon: 'fire' as const, match: ['piri-piri chicken'] },
  { title: 'Seafood, cod + octopus', icon: 'fish' as const, match: ['seafood'] },
  { title: 'Wine + dinner', icon: 'glass-wine' as const, match: ['dinner', 'lunch'] },
  { title: 'Port, wine + cocktails', icon: 'glass-cocktail' as const, match: ['cocktails', 'wine tasting', 'tasting with a view', 'bar'] },
  { title: 'Coffee + local pastries', icon: 'coffee' as const, match: ['coffee', 'bakery'] },
  { title: 'Dessert', icon: 'ice-cream' as const, match: ['dessert'] }
];

export default function FoodScreen() {
  const { trip } = useTrip();
  const items = trip.cities.flatMap(city => city.days).flatMap(day => day.segments);
  return (
    <Screen eyebrow="Portugal + Mallorca" title="The food trail">
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>PREFER MINIMAL PORK · FLEXIBLE</Text>
        <Text style={styles.warningText}>{NO_PORK_MESSAGE}</Text>
      </View>
      {groups.map(group => (
        <FoodTrailGroup
          key={group.title}
          title={group.title}
          icon={group.icon}
          items={items.filter(item => group.match.some(category => item.category.includes(category)))}
        />
      ))}
    </Screen>
  );
}
const styles = StyleSheet.create({
  warning: { backgroundColor: colors.blush, borderRadius: radius.lg, padding: spacing.lg },
  warningTitle: { color: colors.danger, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  warningText: { color: colors.ink, fontSize: 13, lineHeight: 19, marginTop: 6 }
});
