import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GooglePlaceMetadata } from '@/src/types/models';
import { colors, radius, spacing } from '@/src/theme/tokens';
import { googleMapsPlaceUrl } from '@/src/utils/maps';
import { GoogleMapsButton } from './GoogleMapsButton';
import { useState } from 'react';

const iconForCategory = (category: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  if (category.includes('hotel')) return 'bed-king-outline';
  if (category.includes('food') || category.includes('lunch') || category.includes('dinner')) return 'silverware-fork-knife';
  if (category.includes('wine') || category.includes('tasting') || category.includes('cocktail')) return 'glass-wine';
  if (category.includes('beach') || category.includes('coast')) return 'waves';
  if (category.includes('transport') || category.includes('flight')) return 'car-outline';
  if (category.includes('view')) return 'binoculars';
  return 'camera-outline';
};

export function PlaceMediaCard({
  title,
  category,
  mapsUrl,
  metadata
}: {
  title: string;
  category: string;
  mapsUrl: string;
  metadata?: GooglePlaceMetadata;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const placeUrl = metadata?.googlePlaceId
    ? googleMapsPlaceUrl(title, metadata.googlePlaceId)
    : mapsUrl;
  return (
    <View style={styles.card}>
      {metadata?.photoUrl && metadata.photoUrl !== failedPhoto ? (
        <>
          <Image source={{ uri: metadata.photoUrl, cache: 'force-cache' }} style={styles.image} resizeMode="cover" onError={() => setFailedPhoto(metadata.photoUrl)} />
          {metadata.photoAttribution ? <Text style={styles.attribution}>{metadata.photoAttribution}</Text> : null}
        </>
      ) : (
        <LinearGradient colors={[colors.sky, colors.mint]} style={styles.placeholder}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name={iconForCategory(category)} size={38} color={colors.forestDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>VISUAL CHECK</Text>
            <Text style={styles.title}>See the entrance, setting, and latest visitor photos</Text>
            <Text style={styles.note}>{failedPhoto ? 'Saved photo unavailable. Open Maps for current photos when connected.' : 'Refresh Google information to load a photo, or open visitor photos in Maps.'}</Text>
          </View>
        </LinearGradient>
      )}
      <View style={styles.actions}>
        <GoogleMapsButton url={mapsUrl} compact />
        <GoogleMapsButton url={placeUrl} compact action="photos" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  image: { width: '100%', height: 220 },
  attribution: { color: colors.muted, fontSize: 9, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  placeholder: { minHeight: 155, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  icon: { width: 66, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,.65)', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: colors.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 4 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 5 },
  actions: { padding: spacing.md, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }
});
