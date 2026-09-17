import { StyleSheet, Text, View } from 'react-native';
import { Stay } from '@/src/types/models';
import { Badge } from './Badge';
import { GoogleMapsButton } from './GoogleMapsButton';
import { colors, radius, spacing } from '@/src/theme/tokens';

export function StayCard({ stay }: { stay: Stay }) {
  return <View style={styles.card}>
    <Badge tone="mint">Booked · {stay.type}</Badge>
    <Text style={styles.title}>{stay.name}</Text>
    <Text style={styles.body}>{stay.startDate} → {stay.endDate}</Text>
    <Text style={styles.body}>{stay.address}</Text>
    {stay.notes.map(note => <Text key={note} style={styles.body}>• {note}</Text>)}
    <GoogleMapsButton url={stay.googleMapsUrl} action="directions" />
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 }
});
