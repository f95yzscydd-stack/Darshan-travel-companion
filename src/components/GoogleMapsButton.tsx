import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '@/src/theme/tokens';

export function GoogleMapsButton({
  url,
  compact = false,
  action = 'map'
}: {
  url: string;
  compact?: boolean;
  action?: 'map' | 'photos' | 'directions';
}) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      style={({ pressed }) => [
        styles.button,
        action === 'photos' && styles.photoButton,
        compact && styles.compact,
        pressed && { opacity: 0.72 }
      ]}
    >
      <MaterialCommunityIcons
        name={action === 'photos' ? 'image-multiple-outline' : action === 'directions' ? 'directions' : 'map-marker-radius-outline'}
        size={16}
        color={action === 'photos' ? colors.forestDark : colors.white}
      />
      <Text style={[styles.text, action === 'photos' && styles.photoText]}>
        {action === 'photos' ? (compact ? 'Photos' : 'Photos & reviews') : action === 'directions' ? 'Directions' : (compact ? 'Map' : 'Open in Google Maps')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.forest, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoButton: { backgroundColor: colors.mint },
  compact: { paddingVertical: 8, paddingHorizontal: 12 },
  text: { color: colors.white, fontSize: 12, fontWeight: '800' },
  photoText: { color: colors.forestDark }
});
