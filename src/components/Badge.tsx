import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/src/theme/tokens';

export function Badge({
  children,
  tone = 'mint',
  style
}: PropsWithChildren<{ tone?: 'mint' | 'lime' | 'blush' | 'sky' | 'sand' | 'dark'; style?: StyleProp<ViewStyle> }>) {
  const palette = {
    mint: [colors.mint, colors.forestDark],
    lime: [colors.lime, colors.forestDark],
    blush: [colors.blush, colors.danger],
    sky: [colors.sky, '#315669'],
    sand: [colors.sand, '#735C34'],
    dark: [colors.forestDark, colors.white]
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette[0] }, style]}>
      <Text style={[styles.text, { color: palette[1] }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 0.35, textTransform: 'uppercase' }
});
