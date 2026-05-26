/**
 * Mirrorbite v1.1 — Trends tab
 *
 * Categorical aggregates only (Mirrorbite never reports specific gram or
 * calorie numbers — Trends MUST stay categorical too, per spec rule).
 *
 *   - 7-day reveal count
 *   - 7-day avg score (or "—" if < 3 reveals)
 *   - Per-axis frequency (good/caution/low %)
 *   - Withheld rate (transparency stat — % of attempts the model held back)
 */

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadAllResults, loadHistory, type HistoryEntry } from '@/lib/reveal-state';
import type { RevealResult } from '@/lib/gpt4-vision';
import type { Axis, AxisLevel } from '@/lib/theme';
import { colors, radii, shadows, spacing } from '@/lib/theme';

type AxisCounts = Record<AxisLevel, number>;
type AggregatedAxes = Record<Axis, AxisCounts>;

interface Aggregated {
  total: number;
  delivered: number;
  withheld: number;
  scores: number[];
  axes: AggregatedAxes;
}

const AXIS_LABELS: Record<Axis, string> = {
  protein: 'Protein',
  carb_balance: 'Carb balance',
  fiber: 'Fiber',
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function emptyAxisCounts(): AxisCounts {
  return { good: 0, caution: 0, low: 0 };
}

function emptyAgg(): Aggregated {
  return {
    total: 0, delivered: 0, withheld: 0, scores: [],
    axes: { protein: emptyAxisCounts(), carb_balance: emptyAxisCounts(), fiber: emptyAxisCounts() },
  };
}

async function aggregateLastSevenDays(history: HistoryEntry[]): Promise<Aggregated> {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const recent = history.filter((h) => h.ts >= cutoff);
  // Single AsyncStorage read — vs N×loadResult which re-parses the whole map per call.
  const resultsMap = await loadAllResults();
  const agg = emptyAgg();
  for (const h of recent) {
    agg.total++;
    if ((h.sampleKey ?? '').startsWith('withheld')) {
      agg.withheld++;
      continue;
    }
    agg.delivered++;
    if (!h.resultId) continue;
    const res: RevealResult | undefined = resultsMap[h.resultId];
    if (!res) continue;
    if (res.score != null) agg.scores.push(res.score);
    if (res.axes) {
      (['protein', 'carb_balance', 'fiber'] as Axis[]).forEach((axis) => {
        const lvl = res.axes?.[axis];
        if (lvl) agg.axes[axis][lvl]++;
      });
    }
  }
  return agg;
}

export default function TrendsScreen() {
  const [agg, setAgg] = useState<Aggregated | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const h = await loadHistory();
        const a = await aggregateLastSevenDays(h);
        if (!cancelled) setAgg(a);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!agg) return <SafeAreaView style={styles.root} />;

  const avgScore = agg.scores.length >= 3
    ? Math.round(agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length)
    : null;
  const withheldRate = agg.total > 0 ? Math.round((agg.withheld / agg.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityRole="header">Trends</Text>
        <Text style={styles.subtitle}>Last 7 days · directional only, no invented numbers</Text>

        {agg.total === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Not enough reveals yet.</Text>
            <Text style={styles.emptyBody}>
              Snap a few meals this week and we'll show your directional pattern here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{agg.delivered}</Text>
                <Text style={styles.statLabel}>reveals</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{avgScore ?? '—'}</Text>
                <Text style={styles.statLabel}>avg index</Text>
                {!avgScore && (
                  <Text style={styles.statHint}>need 3+ reveals</Text>
                )}
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{withheldRate}%</Text>
                <Text style={styles.statLabel}>held back</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>3 axes — frequency this week</Text>
              {(['protein', 'carb_balance', 'fiber'] as Axis[]).map((axis) => {
                const counts = agg.axes[axis];
                const total = counts.good + counts.caution + counts.low;
                return (
                  <View key={axis} style={styles.axisRow}>
                    <Text style={styles.axisName}>{AXIS_LABELS[axis]}</Text>
                    <View style={styles.bar}>
                      <View style={[styles.barSeg, styles.barGood, { flex: counts.good || 0.0001 }]} />
                      <View style={[styles.barSeg, styles.barCaution, { flex: counts.caution || 0.0001 }]} />
                      <View style={[styles.barSeg, styles.barLow, { flex: counts.low || 0.0001 }]} />
                    </View>
                    <Text style={styles.axisCount}>{total}</Text>
                  </View>
                );
              })}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.teal500 }]} /><Text style={styles.legendText}>good</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.amber500 }]} /><Text style={styles.legendText}>caution</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.red500 }]} /><Text style={styles.legendText}>low</Text></View>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              Categorical patterns only. Mirrorbite never reports specific gram or calorie amounts —
              and it never extrapolates to a medical claim.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: spacing.s6, paddingBottom: spacing.s8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink900, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.ink500, marginTop: 2, marginBottom: spacing.s4 },
  empty: { paddingVertical: spacing.s8, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink900, marginBottom: spacing.s2 },
  emptyBody: { fontSize: 13, color: colors.ink500, textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.s4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.s5 },
  statCard: { flex: 1, padding: spacing.s4, borderRadius: radii.lg, backgroundColor: colors.teal50, alignItems: 'center', ...shadows.card },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.ink900, letterSpacing: -1 },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.ink500, marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  statHint: { fontSize: 10, color: colors.ink400, marginTop: 2 },
  section: { backgroundColor: colors.canvas, padding: spacing.s4, borderRadius: radii.lg, ...shadows.card, marginBottom: spacing.s4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.ink700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.s3 },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  axisName: { width: 96, fontSize: 13, color: colors.ink800, fontWeight: '500' },
  bar: { flex: 1, height: 10, backgroundColor: colors.ink100, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
  barSeg: { height: '100%' },
  barGood: { backgroundColor: colors.teal500 },
  barCaution: { backgroundColor: colors.amber500 },
  barLow: { backgroundColor: colors.red500 },
  axisCount: { width: 24, textAlign: 'right', fontSize: 12, color: colors.ink500, fontWeight: '600' },
  legendRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: spacing.s2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.ink500, fontWeight: '500' },
  disclaimer: { fontSize: 11, color: colors.ink400, textAlign: 'center', lineHeight: 16, marginTop: spacing.s3 },
});
