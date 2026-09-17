import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { DayTimeline } from '@/src/components/DayTimeline';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';

export default function DayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, addSegment } = useTrip();
  const day = trip.cities.flatMap(city => city.days).find(item => item.id === id);
  if (!day) return <Screen title="Day not found"><Text>This plan is no longer available.</Text></Screen>;
  const date = new Date(`${day.date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <Screen eyebrow={date} title={day.title}>
      <DayTimeline day={day} />
      <Pressable
        onPress={() => {
          const segmentId = addSegment(day.id);
          setTimeout(() => router.push(`/place/${segmentId}`), 0);
        }}
        style={styles.add}
      >
        <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
        <Text style={styles.addText}>Add a flexible stop</Text>
      </Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  add: { backgroundColor: colors.forest, borderRadius: radius.pill, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  addText: { color: colors.white, fontWeight: '800' }
});
