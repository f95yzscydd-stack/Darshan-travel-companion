import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';

export function OfflineStatusBanner() {
  const { isOnline, isHydrated, storageError } = useTrip();
  return (
    <View style={[styles.banner, !isOnline && styles.offline]}>
      <MaterialCommunityIcons name={isOnline ? 'cloud-check-outline' : 'cloud-off-outline'} size={16} color={colors.forestDark} />
      <Text style={styles.text}>{storageError ?? (!isHydrated ? 'Loading your saved itinerary…' : isOnline ? 'Itinerary saved on this device' : 'Offline mode · edits stay on this device')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  offline: { backgroundColor: colors.sand },
  text: { color: colors.forestDark, fontSize: 13, fontWeight: '700' }
});
