import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { StayCard } from '@/src/components/StayCard';
import { Badge } from '@/src/components/Badge';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';

export default function MallorcaScreen() {
  const { trip, toggleTravelTask } = useTrip();
  const city = trip.cities.find(c => c.id === 'mallorca-2026');
  if (!city) return <Screen title="Mallorca"><Text>Loading your next leg…</Text></Screen>;
  return <Screen eyebrow="Spain · September 25–October 2 · 7 nights" title="Mallorca, at your pace.">
    <Text style={styles.body}>Pine Walk mornings, the Tramuntana coast, and a car-free Palma finale. Three booked bases anchor the week.</Text>
    {city.stays.map(stay => <StayCard key={stay.id} stay={stay} />)}
    <Text style={styles.title}>Before you go</Text>
    {city.tasks?.map(task => <Pressable key={task.id} accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} onPress={() => toggleTravelTask(city.id, task.id)} style={styles.card}>
      <Text style={styles.body}>{task.completed ? '✓' : '□'} {task.title}</Text><Badge tone="sand">Due {task.dueDate}</Badge>
    </Pressable>)}
    <Text style={styles.title}>Fixed transport bookings</Text>
    {city.transportBookings?.map(booking => <View key={booking.id} style={styles.card}>
      <Badge tone="mint">Booked · {booking.type === 'flight' ? 'Flight · local times' : 'Rental car'}</Badge>
      <Text style={styles.title}>{booking.type === 'flight' ? booking.carrier + ' ' + booking.flightNumber : booking.provider}</Text>
      <Text style={styles.body}>{booking.type === 'flight' ? booking.date + ' · ' + booking.origin + ' ' + booking.depart + ' → ' + booking.destination + ' ' + booking.arrive : booking.pickup + ' → ' + booking.return}</Text>
      {booking.vehicleClass ? <Text style={styles.body}>{booking.vehicleClass} · €{booking.price?.toFixed(2)}</Text> : null}
      {booking.notes?.map(note => <Text key={note} style={styles.body}>{note}</Text>)}
      {booking.prePickupChecklist?.map(task => <Pressable key={task.id} accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }} onPress={() => toggleTravelTask(city.id, task.id)}>
        <Text style={styles.check}>{task.completed ? '✓' : '□'} Confirm {task.title.toLowerCase()}</Text>
      </Pressable>)}
    </View>)}
    <Text style={styles.title}>Your Mallorca days</Text>
    {city.days.map(day => <Pressable key={day.id} style={styles.card} onPress={() => router.push(`/day/${day.id}`)} accessibilityRole="button">
      <Text style={styles.date}>{day.date}</Text><Text style={styles.title}>{day.title} →</Text>
      <Text style={styles.body}>{city.stays.find(stay => stay.id === day.stayId)?.name}</Text>
    </Pressable>)}
  </Screen>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.sm },
  title: { fontSize: 20, color: colors.ink, fontWeight: '800' },
  body: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  date: { color: colors.coral, fontSize: 12, fontWeight: '800' },
  check: { color: colors.forest, fontSize: 14, paddingVertical: spacing.sm, fontWeight: '600' }
});
