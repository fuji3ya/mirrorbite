/**
 * Mirrorbite — Act 1-1: What are you working on?
 * 4 picks → goal_hint, GPT-4 prompt の user variable に直結
 *
 * spec: onboarding-3act-spec.md §Act 1-1
 */

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadOnboardingState, saveOnboardingState, type GoalHint } from '@/lib/onboarding-state';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';

const OPTIONS: { id: GoalHint; emoji: string; label: string }[] = [
  { id: 'balanced', emoji: '⚖️', label: 'Balanced eating' },
  { id: 'fiber_focus', emoji: '🌾', label: 'Higher fiber' },
  { id: 'higher_protein', emoji: '💪', label: 'Higher protein' },
  { id: 'lower_carb', emoji: '🥗', label: 'Lower carb' },
];

export default function GoalScreen() {
  const [selected, setSelected] = useState<GoalHint | null>(null);
  const pickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadOnboardingState().then((s) => setSelected(s.goal_hint));
    return () => {
      if (pickTimerRef.current) clearTimeout(pickTimerRef.current);
    };
  }, []);

  const onPick = async (id: GoalHint) => {
    if (pickTimerRef.current) return; // ignore re-tap while the 280ms transition is queued
    setSelected(id);
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'a1_eatout', goal_hint: id });
    pickTimerRef.current = setTimeout(() => {
      pickTimerRef.current = null;
      router.push('/(onboarding)/a1-eatout');
    }, 280);
  };

  const onSkip = async () => {
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'a1_eatout', goal_hint: s.goal_hint ?? 'balanced' });
    router.push('/(onboarding)/a1-eatout');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: '25%' }]} />
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>Step 1 of 4</Text>
        <Text style={styles.title}>What are you{'\n'}working on?</Text>
        <Text style={styles.sub}>Pick the one that fits today.</Text>

        <View style={styles.picks}>
          {OPTIONS.map((opt) => {
            const isSel = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onPick(opt.id)}
                style={({ pressed }) => [
                  styles.pick,
                  isSel && styles.pickSelected,
                  pressed && styles.pickPressed,
                ]}
              >
                <View style={[styles.ico, isSel && styles.icoSelected]}>
                  <Text style={[styles.icoEmoji, isSel && styles.icoEmojiSelected]}>{opt.emoji}</Text>
                </View>
                <Text style={styles.pickLabel}>{opt.label}</Text>
                {isSel && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onSkip} style={styles.skipWrap}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  progress: {
    height: 3,
    backgroundColor: colors.ink100,
    marginHorizontal: spacing.s6,
    marginTop: spacing.s2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.teal500,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s4,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.ink500,
  },
  title: {
    ...typography.titleXL,
    marginTop: spacing.s2,
    color: colors.ink900,
  },
  sub: {
    ...typography.sub,
    marginTop: spacing.s2,
  },
  picks: {
    marginTop: spacing.s5,
    gap: spacing.s3,
  },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    padding: 18,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.ink50,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickSelected: {
    backgroundColor: colors.teal50,
    borderColor: colors.teal500,
    ...shadows.card,
  },
  pickPressed: {
    transform: [{ scale: 0.985 }],
  },
  ico: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icoSelected: {
    backgroundColor: colors.teal500,
  },
  icoEmoji: {
    fontSize: 18,
  },
  icoEmojiSelected: {
    color: '#fff',
  },
  pickLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink800,
    letterSpacing: -0.2,
  },
  check: {
    color: colors.teal500,
    fontSize: 20,
    fontWeight: '700',
  },
  skipWrap: {
    alignSelf: 'center',
    paddingVertical: spacing.s3,
    marginTop: spacing.s5,
  },
  skip: {
    color: colors.ink500,
    fontSize: 15,
    fontWeight: '600',
  },
});
