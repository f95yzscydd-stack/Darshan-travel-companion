import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ItineraryDay } from '@/src/types/models';
import { colors, spacing } from '@/src/theme/tokens';
import { SegmentCard } from './SegmentCard';
import { CoffeeLayer } from './CoffeeLayer';
import { PlaceCard } from './PlaceCard';
import { useTrip } from '@/src/context/TripContext';
import { StayCard } from './StayCard';

export function DayTimeline({ day }: { day: ItineraryDay }) {
  const { trip, swapDayPlan } = useTrip();
  const city = trip.cities.find(city => city.days.some(item => item.id === day.id));
  const stay = city?.stays?.find(stay => stay.id === day.stayId);
  return (
    <View style={styles.wrap}>
      <Text style={styles.theme}>{day.theme}</Text>
      <Text style={styles.summary}>{day.summary}</Text>
      {stay ? <View style={styles.wrap}><Text style={styles.theme}>Your booked base · {day.date}</Text><StayCard stay={stay} /></View> : null}
      {day.alerts?.map(alert => <View key={alert.title} style={styles.alert}>
        <Text style={styles.theme}>{alert.title}</Text><Text style={styles.summary}>{alert.message}</Text>
        {alert.links?.map(link => <Pressable key={link.url} accessibilityRole="link" onPress={() => void Linking.openURL(link.url)}><Text style={styles.link}>{link.label} ↗</Text></Pressable>)}
      </View>)}
      {day.planAlternatives ? <View style={styles.alert}>
        <Text style={styles.theme}>{day.planChoice === 'backup' ? 'Weather/Crowd backup · road plan active' : 'Primary plan · boat plan active'}</Text>
        <Text style={styles.summary}>Switch both travel legs together. Your other stops and notes stay in place.</Text>
        <Pressable accessibilityRole="button" onPress={() => swapDayPlan(day.id)}><Text style={styles.link}>Use {day.planAlternatives.label}</Text></Pressable>
      </View> : null}
      <CoffeeLayer dayId={day.id} />
      <View style={styles.timeline}>
        {day.segments.map((segment, index) => (
          <SegmentCard key={segment.id} segment={segment} dayId={day.id} isLast={index === day.segments.length - 1} />
        ))}
      </View>
      {day.backups?.length ? <View style={styles.wrap}>
        <Text style={styles.theme}>Saved backups · not scheduled</Text>
        {day.backups.map(place => <PlaceCard key={place.id} place={place} />)}
      </View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  alert: { backgroundColor: colors.sand, borderRadius: 18, padding: spacing.lg, gap: spacing.sm, marginVertical: spacing.sm },
  link: { color: colors.forest, fontSize: 14, fontWeight: '800', paddingVertical: 8 },
  wrap: { gap: spacing.sm },
  theme: { color: colors.forest, fontSize: 15, fontWeight: '800' },
  summary: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  timeline: { gap: 0 }
});
