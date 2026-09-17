import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/src/theme/tokens';

export function TripHeader() {
  return (
    <LinearGradient colors={[colors.forestDark, '#2D7256']} style={styles.hero}>
      <View style={styles.top}>
        <View style={styles.cityPill}>
          <MaterialCommunityIcons name="map-marker" size={14} color={colors.lime} />
          <Text style={styles.city}>Lisbon → Porto → Mallorca</Text>
        </View>
        <Text style={styles.dates}>SEP 19–OCT 2 · 13 NIGHTS</Text>
      </View>
      <View style={styles.bottom}>
        <View>
          <Text style={styles.kicker}>PORTUGAL + SPAIN</Text>
          <Text style={styles.title}>A little{'\n'}further.</Text>
        </View>
        <View style={styles.sun}>
          <MaterialCommunityIcons name="white-balance-sunny" size={34} color={colors.forestDark} />
        </View>
      </View>
      <Text style={styles.hotel}>Five bases · Lisbon, Porto & Mallorca</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, minHeight: 280, padding: spacing.xl, justifyContent: 'space-between', overflow: 'hidden' },
  top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cityPill: { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  city: { color: colors.white, fontSize: 12, fontWeight: '700' },
  dates: { color: '#C9D9D0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kicker: { color: colors.lime, fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 8 },
  title: { color: colors.white, fontSize: 48, lineHeight: 47, fontWeight: '800', letterSpacing: -2 },
  sun: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  hotel: { color: '#D7E4DD', fontSize: 13, fontWeight: '600' }
});
