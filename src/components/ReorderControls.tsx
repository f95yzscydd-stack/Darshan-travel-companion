import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/src/theme/tokens';

export function ReorderControls({ onUp, onDown, disabled, label = 'stop' }: { onUp: () => void; onDown: () => void; disabled?: boolean; label?: string }) {
  return (
    <View style={[styles.wrap, disabled && { opacity: 0.3 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${label} up`} disabled={disabled} onPress={onUp} style={styles.button}><MaterialCommunityIcons name="chevron-up" size={18} color={colors.ink} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Move ${label} down`} disabled={disabled} onPress={onDown} style={styles.button}><MaterialCommunityIcons name="chevron-down" size={18} color={colors.ink} /></Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.canvas, borderRadius: radius.pill },
  button: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center' }
});
