import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTAButton } from '@/components/CTAButton';
import { loadOnboardingState, saveOnboardingState } from '@/lib/onboarding-state';
import { colors, radii, spacing, typography } from '@/lib/theme';

const MEALS = [
  { meal: 'bf', label: 'Breakfast', chips: ['grain', 'protein', 'sweet', 'light'] as const },
  { meal: 'ln', label: 'Lunch', chips: ['salad', 'bowl', 'sandwich', 'hot'] as const },
  { meal: 'dn', label: 'Dinner', chips: ['meat', 'pasta', 'light', 'skip'] as const },
] as const;

const LABEL: Record<string, string> = {
  grain: 'Grain', protein: 'Protein', sweet: 'Sweet', light: 'Light',
  salad: 'Salad', bowl: 'Bowl', sandwich: 'Sandwich', hot: 'Hot meal',
  meat: 'Meat', pasta: 'Pasta', skip: 'Skipped',
};

export default function BaselineScreen() {
  const [sel, setSel] = useState<{ bf: string | null; ln: string | null; dn: string | null }>({ bf: null, ln: null, dn: null });

  const pick = (meal: 'bf' | 'ln' | 'dn', v: string) => setSel((p) => ({ ...p, [meal]: v }));
  const allFilled = sel.bf && sel.ln && sel.dn;
  const missing = (['bf', 'ln', 'dn'] as const).filter((m) => !sel[m]);
  const missingLabel =
    missing.length === 0
      ? null
      : `Pick one chip for ${missing.map((m) => MEALS.find((mm) => mm.meal === m)!.label).join(' and ')}`;

  const onContinue = async () => {
    if (!allFilled) return;
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'a2_mystery', baseline_meals: sel });
    router.push('/(onboarding)/a2-mystery');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.progress}><View style={[styles.progressFill, { width: '75%' }]} /></View>
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: spacing.s8 }}>
        <Text style={styles.eyebrow}>Step 3 of 4</Text>
        <Text style={styles.title}>Your last{'\n'}3 meals</Text>
        <Text style={styles.sub}>Tap the closest match for each.</Text>
        {MEALS.map((m) => (
          <View key={m.meal} style={styles.row}>
            <Text style={styles.rowLabel}>{m.label}</Text>
            <View style={styles.chips}>
              {m.chips.map((c) => {
                const isSel = (sel as any)[m.meal] === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => pick(m.meal as any, c)}
                    style={[styles.chip, isSel && styles.chipSel]}
                  >
                    <Text style={[styles.chipLabel, isSel && styles.chipLabelSel]}>{LABEL[c]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ marginTop: spacing.s5 }}>
          <CTAButton
            label="Continue"
            disabled={!allFilled}
            onPress={onContinue}
            accessibilityLabel={allFilled ? 'Continue' : missingLabel ?? 'Continue'}
            accessibilityState={{ disabled: !allFilled }}
          />
          {missingLabel && (
            <Text style={styles.hint} accessibilityRole="text">{missingLabel}</Text>
          )}
        </View>
      </ScrollView>
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
  row: { marginTop: spacing.s4 },
  rowLabel: { fontSize: 12, fontWeight: '700', color: colors.ink500, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.s2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.ink50, borderWidth: 1.5, borderColor: 'transparent', justifyContent: 'center' },
  chipSel: { backgroundColor: colors.teal500, borderColor: colors.teal500 },
  chipLabel: { fontSize: 14, fontWeight: '500', color: colors.ink700, letterSpacing: -0.15 },
  chipLabelSel: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: colors.ink500, textAlign: 'center', marginTop: spacing.s3, lineHeight: 16 },
});
