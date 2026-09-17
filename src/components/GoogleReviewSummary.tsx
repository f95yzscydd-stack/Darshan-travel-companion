import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { GooglePlaceMetadata } from '@/src/types/models';
import { metadataTimestamp } from '@/src/utils/placeMetadata';
import { colors, radius, spacing } from '@/src/theme/tokens';

const formatReviewCount = (count: number) =>
  new Intl.NumberFormat('en-CA').format(count);

export function GoogleRatingInline({ metadata }: { metadata?: GooglePlaceMetadata }) {
  if (!metadata?.rating || !metadata.reviewCount) return null;
  return (
    <View style={styles.inline}>
      <MaterialCommunityIcons name="star" size={14} color={colors.gold} />
      <Text style={styles.inlineRating}>{metadata.rating.toFixed(1)}</Text>
      <Text style={styles.inlineCount}>Google · {formatReviewCount(metadata.reviewCount)} reviews · cached {metadataTimestamp(metadata)?.slice(0, 10) ?? 'date unknown'}</Text>
    </View>
  );
}

export function GoogleReviewSummary({ metadata }: { metadata?: GooglePlaceMetadata }) {
  if (!metadata?.rating || !metadata.reviewCount) return null;
  const timestamp = metadataTimestamp(metadata);
  const verifiedDate = timestamp && /^\d{4}-\d{2}-\d{2}$/.test(timestamp) ? timestamp : timestamp
    ? new Date(timestamp).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'date unknown';
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.score}>
          <MaterialCommunityIcons name="star" size={22} color={colors.gold} />
          <Text style={styles.rating}>{metadata.rating.toFixed(1)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Google reviews</Text>
          <Text style={styles.count}>{formatReviewCount(metadata.reviewCount)} reviews · {metadata.cacheState === 'historical' ? 'historical snapshot' : 'cached'} {verifiedDate}</Text>
        </View>
        <View style={[
          styles.validation,
          metadata.reviewValidation === 'mixed' && styles.validationMixed
        ]}>
          <Text style={[
            styles.validationText,
            metadata.reviewValidation === 'mixed' && styles.validationTextMixed
          ]}>{metadata.reviewValidation === 'strong' ? 'Strong signal' : metadata.reviewValidation === 'mixed' ? 'Mixed signal' : 'Good signal'}</Text>
        </View>
      </View>
      {metadata.reviewSummary ? <Text style={styles.summary}>{metadata.reviewSummary}</Text> : null}
      {metadata.reviewTopics?.length ? (
        <View style={styles.topics}>
          {metadata.reviewTopics.slice(0, 5).map(topic => (
            <View key={topic} style={styles.topic}><Text style={styles.topicText}>{topic}</Text></View>
          ))}
        </View>
      ) : null}
      <Text style={styles.disclaimer}>Ratings and counts can change. Curated dish suggestions are separate from live availability.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 6 },
  inlineRating: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  inlineCount: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  score: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  count: { color: colors.muted, fontSize: 10, marginTop: 2 },
  validation: { backgroundColor: colors.mint, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill },
  validationMixed: { backgroundColor: colors.sand },
  validationText: { color: colors.forestDark, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  validationTextMixed: { color: '#735C34' },
  summary: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topic: { backgroundColor: colors.canvas, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  topicText: { color: colors.ink, fontSize: 10, fontWeight: '700' },
  disclaimer: { color: colors.muted, fontSize: 9, lineHeight: 13, fontStyle: 'italic' }
});
