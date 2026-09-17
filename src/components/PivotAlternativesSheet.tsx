import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlternativePlace } from '@/src/types/models';
import { colors, radius, spacing } from '@/src/theme/tokens';
import { PlaceCard } from './PlaceCard';

export function PivotAlternativesSheet({ alternatives, onSelect, locked = false }: { alternatives: AlternativePlace[]; onSelect: (place: AlternativePlace) => void; locked?: boolean }) {
  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.heading}>Good pivots, already vetted</Text>
      <Text style={styles.subhead}>Replacing a stop keeps your original as a backup.</Text>
      {alternatives.map(place => (
        <PlaceCard
          key={place.id}
          place={place}
          action={
            <Pressable disabled={locked || place.unavailableOnPlannedDate} onPress={() => onSelect(place)} style={[styles.replace, (locked || place.unavailableOnPlannedDate) && { opacity: .5 }]}>
              <Text style={styles.replaceText}>{place.unavailableOnPlannedDate ? 'Closed on this date' : locked ? 'Current stop locked' : 'Use this stop'}</Text>
            </Pressable>
          }
        />
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  sheet: { gap: spacing.md },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center' },
  heading: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subhead: { color: colors.muted, fontSize: 13, marginTop: -8 },
  replace: { backgroundColor: colors.coral, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
  replaceText: { color: colors.white, fontSize: 12, fontWeight: '800' }
});
