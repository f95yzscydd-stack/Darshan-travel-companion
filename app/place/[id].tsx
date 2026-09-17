import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge } from '@/src/components/Badge';
import { DietaryWarningBadge, PriorityBadge, ReservationBadge, ValidationBadge } from '@/src/components/Badges';
import { GoogleMapsButton } from '@/src/components/GoogleMapsButton';
import { GoogleReviewSummary } from '@/src/components/GoogleReviewSummary';
import { PlaceMediaCard } from '@/src/components/PlaceMediaCard';
import { Screen } from '@/src/components/Screen';
import { useTrip } from '@/src/context/TripContext';
import { colors, radius, spacing } from '@/src/theme/tokens';
import { hasPorkRisk, NO_PORK_MESSAGE } from '@/src/utils/dietary';
import { useState } from 'react';
import { googlePlacesConfigured } from '@/src/services/googlePlaces';
import { googleMapsSearchUrl } from '@/src/utils/maps';
import { routeDisplay } from '@/src/utils/routes';

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, isOnline, updateSegment, deleteSegment, toggleComplete, refreshPlaceMetadata } = useTrip();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const segment = trip.cities.flatMap(city => city.days).flatMap(day => day.segments).find(item => item.id === id);
  const day = trip.cities.flatMap(city => city.days).find(day => day.segments.some(item => item.id === id));
  const city = trip.cities.find(city => city.days.some(candidateDay => candidateDay.id === day?.id));
  if (!segment) return <Screen title="Place not found"><Text>This stop may have been removed.</Text></Screen>;

  const remove = () => {
    const execute = () => {
      deleteSegment(segment.id);
      router.replace(day ? `/day/${day.id}` : '/');
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Remove ${segment.title}?`)) execute();
    } else {
      Alert.alert('Remove stop?', segment.title, [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: execute }]);
    }
  };

  return (
    <Screen eyebrow={`${segment.timeBlock} · ${segment.category}`} title={segment.title}>
      <View style={styles.badges}>
        <PriorityBadge priority={segment.priority} />
        <ValidationBadge status={segment.validationStatus} />
        {segment.reservationRecommended && <ReservationBadge />}
        {segment.isLocked && <Badge tone="sand">Locked</Badge>}
      </View>
      <Text style={styles.description}>{segment.description}</Text>
      {segment.routeFromPrevious ? <View style={styles.card}>
        <Text style={styles.label}>GETTING HERE</Text>
        <Text style={styles.body}>From {segment.routeFromPrevious.origin}</Text>
        <Text style={styles.body}>To {segment.routeFromPrevious.destination}</Text>
        <Text style={styles.body}>{segment.routeKind === 'boat' ? 'Boat' : segment.routeFromPrevious.mode} · {routeDisplay(segment.routeFromPrevious, isOnline)}</Text>
        {segment.routeFromPrevious.lastUpdated ? <Text style={styles.body}>Updated {new Date(segment.routeFromPrevious.lastUpdated).toLocaleString()}</Text> : null}
        <GoogleMapsButton url={segment.routeFromPrevious.directionsUrl} action="directions" />
      </View> : null}
      <PlaceMediaCard
        title={segment.title}
        category={segment.category}
        mapsUrl={segment.googleMapsUrl}
        metadata={segment.googlePlaceMetadata}
      />
      <GoogleReviewSummary metadata={segment.googlePlaceMetadata} />
      {googlePlacesConfigured ? <Pressable disabled={!isOnline || refreshing} style={styles.secondary} onPress={async () => {
        setRefreshing(true);
        try { const result = await refreshPlaceMetadata(segment.googlePlaceQuery ?? `${segment.title} ${city?.city ?? ''}`); setRefreshMessage(result ? 'Google information updated.' : 'No live information available.'); }
        catch { setRefreshMessage('Could not refresh. Cached information and Google Maps remain available.'); }
        finally { setRefreshing(false); }
      }}><Text style={styles.secondaryText}>{refreshing ? 'Refreshing…' : 'Refresh Google information'}</Text></Pressable> : null}
      {refreshMessage ? <Text style={styles.body}>{refreshMessage}</Text> : null}
      {segment.recommendedDishes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>WHAT TO ORDER · CURATED PICKS</Text>
          {segment.recommendedDishes.map(dish => <Text key={dish} style={styles.listItem}>• {dish}</Text>)}
        </View>
      )}
      {hasPorkRisk(segment.description, segment.dietaryNotes, segment.recommendedDishes) && (
        <View style={styles.warning}>
          <DietaryWarningBadge />
          <Text style={styles.warningText}>{segment.dietaryNotes ?? NO_PORK_MESSAGE}</Text>
        </View>
      )}
      {segment.bookingNote && (
        <View style={styles.card}>
          <Text style={styles.label}>BOOKING NOTE</Text>
          <Text style={styles.body}>{segment.bookingNote}</Text>
        </View>
      )}
      {!segment.isLocked ? <View style={styles.card}>
        <Text style={styles.label}>EDIT THIS STOP</Text>
        <TextInput accessibilityLabel="Stop title" value={segment.title} onChangeText={title => updateSegment(segment.id, { title, googleMapsUrl: googleMapsSearchUrl(`${title}, ${city?.city}`), googlePlaceQuery: undefined, address: undefined, googlePlaceMetadata: undefined })} style={styles.body} />
        <TextInput accessibilityLabel="Stop time" value={segment.timeBlock} onChangeText={timeBlock => updateSegment(segment.id, { timeBlock })} style={styles.body} />
        <TextInput accessibilityLabel="Stop address" placeholder="Street address or place name" value={segment.address ?? ''} onChangeText={address => updateSegment(segment.id, { address: address || undefined })} style={styles.body} />
        <TextInput accessibilityLabel="Stop description" value={segment.description} onChangeText={description => updateSegment(segment.id, { description })} multiline style={styles.body} />
      </View> : null}
      <View style={styles.card}>
        <Text style={styles.label}>YOUR NOTES</Text>
        <TextInput
          accessibilityLabel="Your notes"
          value={segment.userNotes}
          onChangeText={userNotes => updateSegment(segment.id, { userNotes })}
          placeholder="Confirmation number, what to order, a tiny memory…"
          placeholderTextColor="#9AA29C"
          multiline
          style={styles.input}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>ACTUAL COST · {segment.currency}</Text>
        <TextInput
          value={segment.actualCost === undefined ? '' : String(segment.actualCost)}
          onChangeText={value => updateSegment(segment.id, { actualCost: value ? Number(value.replace(',', '.')) || 0 : undefined })}
          placeholder={segment.costUnknown ? 'Enter actual cost' : `Planned ${segment.currency === 'EUR' ? '€' : 'C$'}${segment.estimatedCost}`}
          keyboardType="decimal-pad"
          style={styles.costInput}
        />
      </View>
      {segment.alternatives.length > 0 && (
        <Pressable onPress={() => router.push({ pathname: '/pivot', params: { segmentId: segment.id } })} style={styles.secondary}>
          <MaterialCommunityIcons name="shuffle-variant" size={18} color={colors.forest} />
          <Text style={styles.secondaryText}>See curated alternatives</Text>
        </Pressable>
      )}
      <Pressable onPress={() => toggleComplete(segment.id)} style={[styles.complete, segment.isCompleted && styles.undo]}>
        <MaterialCommunityIcons name={segment.isCompleted ? 'backup-restore' : 'check'} size={19} color={colors.white} />
        <Text style={styles.completeText}>{segment.isCompleted ? 'Mark not complete' : 'Mark complete'}</Text>
      </Pressable>
      {!segment.isLocked && <Pressable onPress={remove}><Text style={styles.delete}>Delete this stop</Text></Pressable>}
    </Screen>
  );
}
const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  label: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: spacing.sm },
  listItem: { color: colors.ink, fontSize: 14, lineHeight: 23, fontWeight: '600' },
  body: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  warning: { backgroundColor: colors.blush, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  warningText: { color: colors.danger, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  input: { color: colors.ink, minHeight: 90, textAlignVertical: 'top', fontSize: 14, lineHeight: 20 },
  costInput: { color: colors.ink, fontSize: 28, fontWeight: '800', paddingVertical: 6 },
  secondary: { borderWidth: 1.5, borderColor: colors.forest, borderRadius: radius.pill, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  secondaryText: { color: colors.forest, fontWeight: '800' },
  complete: { backgroundColor: colors.forest, borderRadius: radius.pill, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  undo: { backgroundColor: colors.muted },
  completeText: { color: colors.white, fontWeight: '800' },
  delete: { color: colors.danger, fontWeight: '700', textAlign: 'center', padding: spacing.sm }
});
