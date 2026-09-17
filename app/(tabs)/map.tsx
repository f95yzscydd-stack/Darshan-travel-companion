import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/src/components/Badge';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, shadow, spacing } from '@/src/theme/tokens';
import { RouteMode } from '@/src/types/models';
import { useState } from 'react';
import { buildRouteLeg, routeDisplay } from '@/src/utils/routes';
import { googleRoutesConfigured } from '@/src/services/googleRoutes';

const modes: Array<{ mode: RouteMode; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = [
  { mode: 'walking', icon: 'walk', label: 'Walk' },
  { mode: 'transit', icon: 'train', label: 'Transit' },
  { mode: 'driving', icon: 'car-outline', label: 'Drive' },
  { mode: 'rideshare', icon: 'car-clock', label: 'Ride' }
];

export default function MapScreen() {
  const { trip, isOnline, refreshDayRoutes } = useTrip();
  const [mode, setMode] = useState<RouteMode>();
  const [refreshing, setRefreshing] = useState(false);
  const [routeMessage, setRouteMessage] = useState('');
  const cities = trip.cities.filter(city => city.days.length > 0);
  const [cityId, setCityId] = useState(cities[0]?.id ?? 'lisbon');
  const city = cities.find(item => item.id === cityId) ?? cities[0];
  const [dayId, setDayId] = useState(city.days[0]?.id ?? '');
  const day = city.days.find(item => item.id === dayId) ?? city.days[0];
  const selectCity = (nextCityId: string) => {
    const nextCity = cities.find(item => item.id === nextCityId);
    setCityId(nextCityId);
    setDayId(nextCity?.days[0]?.id ?? '');
  };
  return (
    <Screen eyebrow="Route view" title={`Move through ${city.city}`}>
      <View style={styles.cityRow}>
        {cities.map(item => (
          <Pressable key={item.id} onPress={() => selectCity(item.id)} style={[styles.cityChip, city.id === item.id && styles.cityChipActive]}>
            <Text style={[styles.cityChipText, city.id === item.id && styles.cityChipTextActive]}>{item.city}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.dayRow}>
        {city.days.map((item, index) => (
          <Pressable key={item.id} onPress={() => setDayId(item.id)} style={[styles.dayChip, day.id === item.id && styles.dayChipActive]}>
            <Text style={[styles.dayChipText, day.id === item.id && styles.dayChipTextActive]}>Day {index + 1}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setMode(undefined)} style={[styles.mode, !mode && styles.modeActive]}>
          <Text style={[styles.modeText, !mode && { color: colors.white }]}>Planned</Text>
        </Pressable>
        {modes.map(item => (
          <Pressable key={item.mode} onPress={() => setMode(item.mode)} style={[styles.mode, mode === item.mode && styles.modeActive]}>
            <MaterialCommunityIcons name={item.icon} size={19} color={mode === item.mode ? colors.white : colors.forestDark} />
            <Text style={[styles.modeText, mode === item.mode && { color: colors.white }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.map}>
        <View style={[styles.road, { transform: [{ rotate: '-18deg' }] }]} />
        <View style={[styles.road, styles.roadTwo, { transform: [{ rotate: '42deg' }] }]} />
        {day.segments.slice(0, 6).map((segment, index) => (
          <View key={segment.id} style={[styles.pin, { left: `${12 + (index * 14) % 72}%`, top: `${15 + (index * 19) % 65}%` }]}>
            <Text style={styles.pinText}>{index + 1}</Text>
          </View>
        ))}
        <View style={styles.mapLabel}>
          <Text style={styles.mapLabelTitle}>{city.city} · {day.title}</Text>
          <Text style={styles.mapLabelMeta}>Stop order preview · not a geographic map · Directions open Google Maps</Text>
        </View>
      </View>
      <Text style={styles.heading}>Route stops</Text>
      <Text style={styles.stopMeta}>Start: {day.segments[0]?.routeFromPrevious?.origin ?? city.homeBase?.address}. Each following route starts at the previous stop. Offline times are planning allowances.</Text>
      {googleRoutesConfigured ? <Pressable disabled={refreshing || !isOnline} onPress={async () => {
        setRefreshing(true);
        try { const count = await refreshDayRoutes(day.id); setRouteMessage(count ? `Updated ${count} travel estimates.` : 'Could not refresh travel times. Check Maps or try again online.'); }
        finally { setRefreshing(false); }
      }}><Text style={styles.heading}>{refreshing ? 'Refreshing…' : 'Refresh planned travel times'}</Text></Pressable> : null}
      {routeMessage ? <Text style={styles.stopMeta}>{routeMessage}</Text> : null}
      {day.segments.map((segment, index) => {
        const leg = buildRouteLeg(city, day, segment, mode);
        const url = leg.directionsUrl;
        return (
          <Pressable key={segment.id} onPress={() => void Linking.openURL(url)} style={styles.stop}>
            <View style={styles.stopNumber}><Text style={styles.stopNumberText}>{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopTitle}>{segment.title}</Text>
              <Text style={styles.stopMeta}>{segment.timeBlock} · {segment.category}</Text>
              <Text style={styles.stopMeta}>From {leg.origin}</Text>
              <Text style={styles.stopMeta}>{segment.routeKind === 'boat' ? 'Boat' : leg.mode} · {routeDisplay(leg, isOnline)}{leg.lastUpdated ? ` · updated ${new Date(leg.lastUpdated).toLocaleString()}` : ''}</Text>
            </View>
            {segment.isLocked && <Badge tone="sand">Locked</Badge>}
            <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.forest} />
          </Pressable>
        );
      })}
    </Screen>
  );
}
const styles = StyleSheet.create({
  cityRow: { flexDirection: 'row', gap: spacing.sm },
  cityChip: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 },
  cityChipActive: { backgroundColor: colors.coral },
  cityChipText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  cityChipTextActive: { color: colors.white },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayChip: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 7 },
  dayChipActive: { backgroundColor: colors.forestDark },
  dayChipText: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  dayChipTextActive: { color: colors.white },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  mode: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 11, alignItems: 'center', gap: 3 },
  modeActive: { backgroundColor: colors.forest },
  modeText: { color: colors.forestDark, fontSize: 10, fontWeight: '800' },
  map: { height: 300, backgroundColor: colors.sky, borderRadius: 26, overflow: 'hidden', position: 'relative' },
  road: { position: 'absolute', width: '140%', height: 32, backgroundColor: '#F7F4E9', top: '48%', left: '-20%', borderWidth: 1, borderColor: '#DDD8C7' },
  roadTwo: { top: '30%', left: '-35%' },
  pin: { position: 'absolute', width: 31, height: 31, borderRadius: 16, backgroundColor: colors.forestDark, borderWidth: 3, borderColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow },
  pinText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  mapLabel: { position: 'absolute', left: 14, right: 14, bottom: 14, backgroundColor: 'rgba(255,255,255,.94)', borderRadius: radius.md, padding: spacing.md },
  mapLabelTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  mapLabelMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  heading: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  stop: { backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stopNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  stopNumberText: { color: colors.forestDark, fontWeight: '900' },
  stopTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  stopMeta: { color: colors.muted, fontSize: 10, marginTop: 2 }
});
