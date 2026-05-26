import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadOnboardingState, saveOnboardingState, type EatOutFreq } from '@/lib/onboarding-state';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';

const OPTIONS: { id: EatOutFreq; emoji: string; label: string }[] = [
  { id: 'rare', emoji: '🏠', label: 'Almost never' },
  { id: 'weekly', emoji: '📅', label: 'A few times a week' },
  { id: 'daily', emoji: '🍽️', label: 'Most days' },
];

export default function EatOutScreen() {
  const [selected, setSelected] = useState<EatOutFreq | null>(null);
  const pickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pickTimerRef.current) clearTimeout(pickTimerRef.current);
    };
  }, []);

  const onPick = async (id: EatOutFreq) => {
    if (pickTimerRef.current) return; // ignore re-tap during the 280ms transition
    setSelected(id);
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'a2_baseline', eat_out_frequency: id });
    pickTimerRef.current = setTimeout(() => {
      pickTimerRef.current = null;
      router.push('/(onboarding)/a2-baseline');
    }, 280);
  };

  const onSkip = async () => {
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'a2_baseline', eat_out_frequency: s.eat_out_frequency ?? 'weekly' });
    router.push('/(onboarding)/a2-baseline');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.progress}><View style={[styles.progressFill, { width: '50%' }]} /></View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>Step 2 of 4</Text>
        <Text style={styles.title}>When do you{'\n'}usually eat out?</Text>
        <Text style={styles.sub}>We'll use this to time your nudges.</Text>
        <View style={styles.picks}>
          {OPTIONS.map((opt) => {
            const isSel = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onPick(opt.id)}
                style={({ pressed }) => [styles.pick, isSel && styles.pickSelected, pressed && { transform: [{ scale: 0.985 }] }]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={opt.label}
              >
                <View style={[styles.ico, isSel && styles.icoSelected]}>
                  <Text style={styles.icoEmoji}>{opt.emoji}</Text>
                </View>
                <Text style={styles.pickLabel}>{opt.label}</Text>
                {isSel && <Text style={styles.check}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={onSkip}
          style={styles.skipWrap}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
        >
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  progress: { height: 3, backgroundColor: colors.ink100, marginHorizontal: spacing.s6, marginTop: spacing.s2, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.teal500 },
  body: { flex: 1, paddingHorizontal: spacing.s6, paddingTop: spacing.s4 },
  eyebrow: { ...typography.eyebrow, color: colors.ink500 },
  title: { ...typography.titleXL, marginTop: spacing.s2, color: colors.ink900 },
  sub: { ...typography.sub, marginTop: spacing.s2 },
  picks: { marginTop: spacing.s5, gap: spacing.s3 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: spacing.s3, padding: 18, paddingHorizontal: 16, borderRadius: radii.lg, backgroundColor: colors.ink50, borderWidth: 1.5, borderColor: 'transparent' },
  pickSelected: { backgroundColor: colors.teal50, borderColor: colors.teal500, ...shadows.card },
  ico: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  icoSelected: { backgroundColor: colors.teal500 },
  icoEmoji: { fontSize: 18 },
  pickLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink800, letterSpacing: -0.2 },
  check: { color: colors.teal500, fontSize: 20, fontWeight: '700' },
  skipWrap: { alignSelf: 'center', paddingVertical: spacing.s3, marginTop: spacing.s5 },
  skip: { color: colors.ink500, fontSize: 15, fontWeight: '600' },
});
