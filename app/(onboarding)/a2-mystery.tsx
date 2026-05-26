import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadOnboardingState, saveOnboardingState } from '@/lib/onboarding-state';
import { colors, spacing, typography } from '@/lib/theme';

export default function MysteryScreen() {
  const navigatedRef = useRef(false);

  const goNext = async () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'a3_processing' });
    router.replace('/(onboarding)/a3-reveal');
  };

  useEffect(() => {
    const t = setTimeout(goNext, 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.progress}><View style={[styles.progressFill, { width: '95%' }]} /></View>
      <Pressable
        style={styles.body}
        onPress={goNext}
        accessibilityRole="button"
        accessibilityLabel="Skip to sample reveal"
      >
        <Text style={styles.eyebrow}>Your index</Text>
        <Text style={styles.qmark}>??</Text>
        <Text style={styles.slash}>/100</Text>
        <Text style={styles.blurb}>Let's see this in action with a sample.</Text>
        <View style={styles.miniRow}>
          <View style={styles.dot} />
          <Text style={styles.mini}>Preparing your sample</Text>
        </View>
        <Text style={styles.tapHint}>Tap anywhere to skip ahead</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  progress: { height: 3, backgroundColor: colors.ink100, marginHorizontal: spacing.s6, marginTop: spacing.s2, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.teal500 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.s6 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', color: colors.ink500, marginBottom: spacing.s3 },
  qmark: { fontSize: 128, fontWeight: '800', color: colors.ink200, letterSpacing: -4, lineHeight: 128 },
  slash: { fontSize: 13, color: colors.ink500, fontWeight: '600' },
  blurb: { fontSize: 15, color: colors.ink700, marginTop: spacing.s6, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.s4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal500 },
  mini: { fontSize: 13, color: colors.ink500 },
  tapHint: { position: 'absolute', bottom: spacing.s8, fontSize: 11, color: colors.ink400, letterSpacing: 0.5 },
});
