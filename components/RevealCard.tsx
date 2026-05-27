/**
 * Mirrorbite — RevealCard
 * Reveal-delivered の中身 (score card / axes bars / strength / improve bullets)
 * Day 4 ゲート 4: hallucination 払拭の主役 UI
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, InteractionManager, StyleSheet, Text, View } from 'react-native';
import { axisBarColor, axisStatusColor, colors, radii, shadows, spacing, typography, type AxisLevel } from '@/lib/theme';
import type { RevealResult } from '@/lib/gpt4-vision';

const AXIS_LABEL: Record<string, string> = {
  protein: 'Protein',
  carb_balance: 'Carb balance',
  fiber: 'Fiber',
};

const LEVEL_WIDTH: Record<AxisLevel, number> = {
  good: 0.8,
  caution: 0.5,
  low: 0.2,
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: colors.green500,
  medium: colors.amber500,
  low: colors.ink300,
};

export function RevealCard({ sample, animate = false }: { sample: RevealResult; animate?: boolean }) {
  if (sample.judgement === 'withheld') return null;
  const dishColor = CONFIDENCE_COLOR[sample.confidence] ?? colors.ink300;

  // Animation: score crossfade (?? → real value) + 3 axes staged fade-in.
  // Onboarding A3 のみで使う (animate=true)。通常 reveal は instant。
  const scoreOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const qmarkOpacity = useRef(new Animated.Value(animate ? 1 : 0)).current;
  const axisOpacities = useRef([
    new Animated.Value(animate ? 0 : 1),
    new Animated.Value(animate ? 0 : 1),
    new Animated.Value(animate ? 0 : 1),
  ]).current;

  useEffect(() => {
    if (!animate) return;
    // Stack navigator のスライド遷移 (300-500ms) が完了してから animation を start。
    // 直接 start すると遷移中に animation が進行してしまい、ユーザーが画面を見たときには
    // ?? がほぼ消えていて crossfade が見えない。InteractionManager で wait することで
    // 「ユーザーが A3 を見始めた瞬間」を起点に animation 開始できる。
    const handle = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(qmarkOpacity, {
          toValue: 0,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scoreOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.stagger(
          500,
          axisOpacities.map((v) =>
            Animated.timing(v, {
              toValue: 1,
              duration: 400,
              delay: 1200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ),
        ),
      ]).start();
    });
    return () => handle.cancel();
  }, [animate, axisOpacities, qmarkOpacity, scoreOpacity]);

  return (
    <View>
      {/* Dish chip */}
      <View style={styles.dishChip}>
        <View style={[styles.confDot, { backgroundColor: dishColor }]} />
        <Text style={styles.dishLabel}>{sample.identified_dish}</Text>
      </View>

      {/* Score card */}
      <View style={styles.scoreCard}>
        <Text style={styles.eyebrow}>TODAY'S INDEX</Text>
        <View style={styles.scoreNumWrap}>
          <Animated.Text style={[styles.scoreNum, { opacity: scoreOpacity }]}>
            {sample.score}
          </Animated.Text>
          {animate && (
            <Animated.Text
              style={[styles.scoreNum, styles.scoreNumOverlay, { opacity: qmarkOpacity }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              ??
            </Animated.Text>
          )}
        </View>
        <Text style={styles.score100}>/100 index</Text>
        <Text style={styles.scoreCaption}>{sample.score_caption}</Text>
      </View>

      {/* Axes */}
      <View style={styles.axesSection}>
        <View style={styles.axesHeader}>
          <Text style={styles.axesTitle}>Today's 3 axes</Text>
          <Text style={styles.axesEyebrow}>CATEGORICAL</Text>
        </View>
        {(['protein', 'carb_balance', 'fiber'] as const).map((axis, idx) => {
          const lvl: AxisLevel = sample.axes?.[axis] ?? 'low';
          const w = LEVEL_WIDTH[lvl];
          const [barFrom, barTo] = axisBarColor[lvl];
          return (
            <Animated.View
              key={axis}
              style={[styles.axisRow, idx > 0 && styles.axisBorder, { opacity: axisOpacities[idx] }]}
            >
              <Text style={styles.axisLabel}>{AXIS_LABEL[axis]}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${w * 100}%`, backgroundColor: barTo },
                  ]}
                />
              </View>
              <Text style={[styles.axisStatus, { color: axisStatusColor[lvl] }]}>
                {lvl.toUpperCase()}
              </Text>
            </Animated.View>
          );
        })}
      </View>

      {/* Strength */}
      <View style={styles.bulletRow}>
        <View style={[styles.bulletIcon, { backgroundColor: colors.teal100 }]}>
          <Text style={[styles.bulletEmoji, { color: colors.teal700 }]}>💪</Text>
        </View>
        <View style={styles.bulletBody}>
          <Text style={styles.bulletLbl}>STRENGTH</Text>
          <Text style={styles.bulletText}>{sample.strength_bullet}</Text>
        </View>
      </View>

      {/* Improve */}
      <View style={styles.bulletRow}>
        <View style={[styles.bulletIcon, { backgroundColor: colors.amber100 }]}>
          <Text style={[styles.bulletEmoji, { color: colors.amber700 }]}>↗</Text>
        </View>
        <View style={styles.bulletBody}>
          <Text style={styles.bulletLbl}>IMPROVE AT DINNER</Text>
          <Text style={styles.bulletText}>{sample.improvement_bullet}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink50,
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingLeft: 8,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginVertical: spacing.s2,
  },
  confDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dishLabel: { fontSize: 13, fontWeight: '600', color: colors.ink800 },
  scoreCard: {
    backgroundColor: colors.teal50,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.teal100,
    padding: spacing.s6,
    paddingTop: spacing.s8,
    alignItems: 'center',
    ...shadows.cardElevated,
    position: 'relative',
  },
  eyebrow: {
    position: 'absolute',
    top: 14,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.teal600,
  },
  scoreNumWrap: {
    marginTop: spacing.s2,
    height: 96,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontSize: 96,
    fontWeight: '800',
    color: colors.ink900,
    lineHeight: 96,
    letterSpacing: -3,
    textAlign: 'center',
  },
  scoreNumOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: colors.ink400,
  },
  score100: { fontSize: 13, color: colors.ink500, marginTop: 4, fontWeight: '600' },
  scoreCaption: { fontSize: 13, color: colors.ink500, marginTop: spacing.s2, textAlign: 'center', lineHeight: 19 },

  axesSection: {
    marginTop: spacing.s5,
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    borderWidth: 0.5,
    borderColor: colors.ink100,
    padding: spacing.s4,
    ...shadows.card,
  },
  axesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s3,
  },
  axesTitle: { fontSize: 13, fontWeight: '700', color: colors.ink900, letterSpacing: -0.1 },
  axesEyebrow: { fontSize: 10, fontWeight: '600', color: colors.ink400, letterSpacing: 1.2 },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: 8,
  },
  axisBorder: { borderTopWidth: 0.5, borderTopColor: colors.ink100 },
  axisLabel: { width: 110, fontSize: 13, color: colors.ink700, fontWeight: '500' },
  barTrack: { flex: 1, height: 6, backgroundColor: colors.ink100, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  axisStatus: { width: 60, textAlign: 'right', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },

  bulletRow: {
    flexDirection: 'row',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletEmoji: { fontSize: 16, fontWeight: '800' },
  bulletBody: { flex: 1, minWidth: 0 },
  bulletLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: colors.ink500 },
  bulletText: { fontSize: 14, color: colors.ink800, lineHeight: 20, marginTop: 2 },
});
