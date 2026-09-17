import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ItinerarySegment } from '@/src/types/models';
import { colors, radius, spacing } from '@/src/theme/tokens';
import { DietaryWarningBadge } from './Badges';
import { hasPorkRisk } from '@/src/utils/dietary';
import { GoogleRatingInline } from './GoogleReviewSummary';

export function FoodTrailGroup({ title, icon, items }: { title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; items: ItinerarySegment[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <View style={styles.icon}><MaterialCommunityIcons name={icon} size={20} color={colors.forestDark} /></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{items.length}</Text>
      </View>
      {items.map(item => (
        <Pressable key={item.id} onPress={() => router.push(`/place/${item.id}`)} style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.date}>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} · {item.timeBlock}</Text>
            <GoogleRatingInline metadata={item.googlePlaceMetadata} />
            <Text style={styles.order}>{item.recommendedDishes.join(' · ') || item.description}</Text>
          </View>
          {hasPorkRisk(item.dietaryNotes, item.description) && <DietaryWarningBadge />}
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  header: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.mint },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800', flex: 1 },
  count: { color: colors.muted, fontWeight: '800' },
  item: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  date: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: .7, textTransform: 'uppercase', marginTop: 3 },
  order: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 }
});
