/**
 * Mirrorbite v1.1 — Library tab
 *
 * Full history list. Each row = thumbnail + dish + ago + judgement chip.
 * Tap → opens the matching reveal screen (delivered or withheld) with that
 * entry's rid + sampleKey.
 */

import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatAgo,
  loadHistory,
  setLastCapture,
  type HistoryEntry,
} from '@/lib/reveal-state';
import { colors, radii, shadows, spacing } from '@/lib/theme';

export default function LibraryScreen() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const h = await loadHistory();
        if (!cancelled) {
          setHistory(h);
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const openEntry = async (h: HistoryEntry) => {
    const target = (h.sampleKey ?? '').startsWith('withheld')
      ? '/(reveal)/withheld'
      : '/(reveal)/delivered';
    const ridParam = h.resultId ? `&rid=${h.resultId}` : '';
    await setLastCapture(h.photoUri, h.sampleKey ?? undefined);
    router.push(`${target}?sample=${h.sampleKey ?? 'delivered_caesar'}${ridParam}` as any);
  };

  const renderRow = ({ item }: { item: HistoryEntry }) => {
    const isWithheld = (item.sampleKey ?? '').startsWith('withheld');
    return (
      <Pressable
        onPress={() => openEntry(item)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`${item.dish ?? 'past meal'}, ${formatAgo(item.ts)}, ${isWithheld ? 'held back' : 'analyzed'}`}
      >
        <ExpoImage source={{ uri: item.photoUri }} style={styles.rowThumb} contentFit="cover" />
        <View style={styles.rowText}>
          <Text style={styles.rowDish} numberOfLines={1}>
            {item.dish ?? (isWithheld ? 'Held back' : 'Past meal')}
          </Text>
          <Text style={styles.rowMeta}>{formatAgo(item.ts)}</Text>
        </View>
        <View style={[styles.chip, isWithheld ? styles.chipWithheld : styles.chipDelivered]}>
          <Text style={[styles.chipText, isWithheld ? styles.chipTextWithheld : styles.chipTextDelivered]}>
            {isWithheld ? 'Held' : 'Read'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Library</Text>
        {!loading && history.length > 0 && (
          <Text style={styles.subtitle}>{history.length} {history.length === 1 ? 'reveal' : 'reveals'}</Text>
        )}
      </View>

      {loading ? null : history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No reveals yet.</Text>
          <Text style={styles.emptyBody}>Snap a meal from the Camera tab — your past reveals will collect here.</Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/camera')}
            style={styles.emptyCta}
            accessibilityRole="button"
            accessibilityLabel="Go to Camera"
          >
            <Text style={styles.emptyCtaText}>Go to Camera</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: spacing.s6, paddingTop: spacing.s4, paddingBottom: spacing.s3 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink900, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.ink500, marginTop: 2 },
  list: { paddingHorizontal: spacing.s4, paddingBottom: spacing.s5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.canvas,
    ...shadows.card,
  },
  rowThumb: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.ink100 },
  rowText: { flex: 1 },
  rowDish: { fontSize: 14, fontWeight: '600', color: colors.ink900, letterSpacing: -0.15 },
  rowMeta: { fontSize: 12, color: colors.ink500, marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  chipDelivered: { backgroundColor: colors.teal100 },
  chipWithheld: { backgroundColor: colors.amber100 },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  chipTextDelivered: { color: colors.teal700 },
  chipTextWithheld: { color: colors.amber700 },
  sep: { height: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s6 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink900, marginBottom: spacing.s2 },
  emptyBody: { fontSize: 13, color: colors.ink500, textAlign: 'center', lineHeight: 18, marginBottom: spacing.s4 },
  emptyCta: { backgroundColor: colors.teal500, paddingVertical: 12, paddingHorizontal: 28, borderRadius: radii.pill },
  emptyCtaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
