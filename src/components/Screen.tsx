import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme/tokens';

export function Screen({ children, title, eyebrow, right }: PropsWithChildren<{
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {(title || eyebrow) && (
          <View style={styles.heading}>
            <View style={styles.headingText}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              {title ? <Text style={styles.title}>{title}</Text> : null}
            </View>
            {right}
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.sm },
  headingText: { flex: 1 },
  eyebrow: { color: colors.coral, fontSize: 12, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 5 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1.1 }
});
