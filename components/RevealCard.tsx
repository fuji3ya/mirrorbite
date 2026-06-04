/**
 * Mirrorbite — RevealCard
 * Reveal-delivered の中身 (score ring / axes ring-cards / strength / improve)
 * Day 4 ゲート 4: hallucination 払拭の主役 UI
 *
 * 2026-05-29 premium pass: 参照ファースト(Cal AI)で reveal-redesign.html を最低ラインとして承認。
 * teal 地色 + ベタ横バー + 絵文字 → 純白 + グラデSVGリング + Phosphor相当アイコン(MaterialCommunityIcons) に移植。
 * spec: generated/research/mirrorbite/design-references/reveal-redesign.html
 * rule: .claude/rules/design-reference-first.md
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, InteractionManager, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, radii, shadows, spacing, type AxisLevel } from '@/lib/theme';
import type { RevealResult } from '@/lib/gpt4-vision';

const AXIS_LABEL: Record<string, string> = {
  protein: 'Protein',
  carb_balance: 'Carbs',
  fiber: 'Fiber',
  fat: 'Fat',
};

const AXIS_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  protein: 'dumbbell',
  carb_balance: 'bread-slice',
  fiber: 'leaf',
  fat: 'oil',
};

const LEVEL_FILL: Record<AxisLevel, number> = { good: 0.8, caution: 0.5, low: 0.2 };

// per-level [from, to] gradient stops + icon/status color
const LEVEL_GRAD: Record<AxisLevel, readonly [string, string]> = {
  good: [colors.teal400, colors.teal700],
  caution: [colors.amber500, colors.amber700],
  low: [colors.red500, colors.red600],
};
const LEVEL_INK: Record<AxisLevel, string> = {
  good: colors.teal700,
  caution: '#B0741A',
  low: colors.red600,
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: colors.green500,
  medium: colors.amber500,
  low: colors.ink300,
};

// ── Score ring geometry (mirrors reveal-redesign.html r=86 sw=13) ──
const RING = 198;
const RING_R = 86;
const RING_C = 2 * Math.PI * RING_R; // 540.35

// ── Axis ring geometry (r=25 sw=6) ──
const AXIS = 60;
const AXIS_R = 25;
const AXIS_C = 2 * Math.PI * AXIS_R; // 157.08

function AxisRing({ axis, level }: { axis: string; level: AxisLevel }) {
  const [from, to] = LEVEL_GRAD[level];
  const ink = LEVEL_INK[level];
  const offset = AXIS_C * (1 - LEVEL_FILL[level]);
  const gid = `axisgrad_${axis}`;
  return (
    <View style={styles.axisRingWrap}>
      <Svg width={AXIS} height={AXIS} viewBox={`0 0 ${AXIS} ${AXIS}`}>
        <Defs>
          <SvgLinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={AXIS / 2} cy={AXIS / 2} r={AXIS_R} fill="none" stroke="#ECEEF0" strokeWidth={6} />
        <Circle
          cx={AXIS / 2}
          cy={AXIS / 2}
          r={AXIS_R}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={AXIS_C}
          strokeDashoffset={offset}
          originX={AXIS / 2}
          originY={AXIS / 2}
          rotation={-90}
        />
      </Svg>
      <View style={styles.axisGlyph}>
        <MaterialCommunityIcons name={AXIS_ICON[axis]} size={24} color={ink} />
      </View>
    </View>
  );
}

export function RevealCard({
  sample,
  animate = false,
  showDishChip = true,
}: {
  sample: RevealResult;
  animate?: boolean;
  showDishChip?: boolean;
}) {
  // Animation: score crossfade (?? → real value) + 3 axes staged fade-in.
  // Onboarding A3 のみで使う (animate=true)。通常 reveal は instant。
  const scoreOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const qmarkOpacity = useRef(new Animated.Value(animate ? 1 : 0)).current;
  const axisOpacities = useRef([
    new Animated.Value(animate ? 0 : 1),
    new Animated.Value(animate ? 0 : 1),
    new Animated.Value(animate ? 0 : 1),
    new Animated.Value(animate ? 0 : 1),
  ]).current;

  useEffect(() => {
    if (!animate) return;
    // Stack navigator のスライド遷移完了後に start (InteractionManager)。
    // 直接 start すると遷移中に進行して crossfade が見えない。
    // 詳細: memory/feedback_animation_timing_dramatic_pacing.md
    const handle = InteractionManager.runAfterInteractions(() => {
      const SETTLE = 400;
      const CROSSFADE = 1500;
      const AXES_START = SETTLE + CROSSFADE + 300; // t=2200
      Animated.parallel([
        Animated.timing(qmarkOpacity, {
          toValue: 0,
          delay: SETTLE,
          duration: CROSSFADE,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scoreOpacity, {
          toValue: 1,
          delay: SETTLE,
          duration: CROSSFADE,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.stagger(
          700,
          axisOpacities.map((v) =>
            Animated.timing(v, {
              toValue: 1,
              duration: 600,
              delay: AXES_START,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ),
        ),
      ]).start();
    });
    return () => handle.cancel();
  }, [animate, axisOpacities, qmarkOpacity, scoreOpacity]);

  if (sample.judgement === 'withheld') return null;
  const dishColor = CONFIDENCE_COLOR[sample.confidence] ?? colors.ink300;
  const ringOffset = RING_C * (1 - (sample.score ?? 0) / 100);

  return (
    <View>
      {/* Dish chip (a3 onboarding only; delivered screen overlays dish on photo) */}
      {showDishChip && (
        <View style={styles.dishChip}>
          <View style={[styles.confDot, { backgroundColor: dishColor }]} />
          <Text style={styles.dishLabel}>{sample.identified_dish}</Text>
        </View>
      )}

      {/* Score ring */}
      <View style={styles.scoreBlock}>
        <Text style={styles.eyebrow}>{"TODAY'S INDEX"}</Text>
        <View style={styles.ringWrap}>
          <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
            <Defs>
              <SvgLinearGradient id="scoregrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.teal400} />
                <Stop offset="1" stopColor={colors.teal700} />
              </SvgLinearGradient>
            </Defs>
            <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke="#ECEEF0" strokeWidth={13} />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              fill="none"
              stroke="url(#scoregrad)"
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={ringOffset}
              originX={RING / 2}
              originY={RING / 2}
              rotation={-90}
            />
          </Svg>
          <View style={styles.ringCenter}>
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
            <Text style={styles.score100}>/ 100 INDEX</Text>
          </View>
        </View>
        <Text style={styles.caption}>{sample.score_caption}</Text>
      </View>

      {/* Axes */}
      <View style={styles.axesHeader}>
        <Text style={styles.axesTitle}>{"Today's 4 axes"}</Text>
        <Text style={styles.axesEyebrow}>CATEGORICAL</Text>
      </View>
      <View style={styles.axesRow}>
        {(['protein', 'carb_balance', 'fiber', 'fat'] as const).map((axis, idx) => {
          const lvl: AxisLevel = sample.axes?.[axis] ?? 'low';
          return (
            <Animated.View key={axis} style={[styles.axisCard, { opacity: axisOpacities[idx] }]}>
              <AxisRing axis={axis} level={lvl} />
              <Text style={styles.axisLabel}>{AXIS_LABEL[axis]}</Text>
              <Text style={[styles.axisStatus, { color: LEVEL_INK[lvl] }]}>{lvl.toUpperCase()}</Text>
            </Animated.View>
          );
        })}
      </View>

      {/* Insights */}
      <View style={styles.insightCard}>
        <View style={styles.insight}>
          <LinearGradient colors={['#E6F6F2', '#CFEEE7']} style={styles.insightIcon}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.teal700} />
          </LinearGradient>
          <View style={styles.insightBody}>
            <Text style={styles.insightLbl}>STRENGTH</Text>
            <Text style={styles.insightTxt}>{sample.strength_bullet}</Text>
          </View>
        </View>
        <View style={[styles.insight, styles.insightBorder]}>
          <LinearGradient colors={['#FFF3DC', '#FCE6BD']} style={styles.insightIcon}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#B0741A" />
          </LinearGradient>
          <View style={styles.insightBody}>
            <Text style={styles.insightLbl}>IMPROVE AT DINNER</Text>
            <Text style={styles.insightTxt}>{sample.improvement_bullet}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.ink50,
    paddingVertical: 7,
    paddingHorizontal: 13,
    paddingLeft: 9,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    marginVertical: spacing.s2,
  },
  confDot: { width: 9, height: 9, borderRadius: 5 },
  dishLabel: { fontSize: 13, fontWeight: '600', color: colors.ink800 },

  scoreBlock: { alignItems: 'center', paddingVertical: spacing.s2 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2.2, color: colors.teal600, marginBottom: spacing.s3 },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scoreNumWrap: { height: 90, minWidth: 130, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 84, fontWeight: '800', color: colors.ink900, lineHeight: 88, letterSpacing: -3.5, textAlign: 'center' },
  scoreNumOverlay: { position: 'absolute', top: 0, left: 0, right: 0, color: colors.ink400 },
  score100: { fontSize: 12, fontWeight: '700', color: colors.ink400, marginTop: 6, letterSpacing: 1 },
  caption: { fontSize: 14, color: colors.ink500, textAlign: 'center', marginTop: spacing.s4, lineHeight: 20, maxWidth: 290 },

  axesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.s6, marginBottom: spacing.s3 },
  axesTitle: { fontSize: 15, fontWeight: '700', color: colors.ink900, letterSpacing: -0.2 },
  axesEyebrow: { fontSize: 10, fontWeight: '700', color: colors.ink400, letterSpacing: 1.4 },
  axesRow: { flexDirection: 'row', gap: 7 },
  axisCard: {
    flex: 1,
    borderRadius: radii.xl,
    paddingTop: 17,
    paddingBottom: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: '#F0F2F3',
    ...shadows.card,
  },
  axisRingWrap: { width: AXIS, height: AXIS, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  axisGlyph: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  axisLabel: { fontSize: 12, fontWeight: '600', color: colors.ink700, letterSpacing: -0.1 },
  axisStatus: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },

  insightCard: {
    marginTop: spacing.s5,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: '#F0F2F3',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.s4,
    ...shadows.card,
  },
  insight: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', paddingVertical: 15 },
  insightBorder: { borderTopWidth: 1, borderTopColor: '#F2F3F4' },
  insightIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightBody: { flex: 1, minWidth: 0 },
  insightLbl: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, color: colors.ink400 },
  insightTxt: { fontSize: 14, color: colors.ink800, lineHeight: 21, marginTop: 4 },
});
