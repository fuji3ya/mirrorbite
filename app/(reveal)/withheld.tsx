import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTAButton } from '@/components/CTAButton';
import { SAMPLE_KEYS, WITHHELD_COPY, getSampleByKey, type RevealResult } from '@/lib/gpt4-vision';
import { isPrivacySeen } from '@/lib/onboarding-state';
import { loadResult } from '@/lib/reveal-state';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';

export default function RevealWithheld() {
  const { sample: rawKey = 'withheld_blurry', rid } = useLocalSearchParams<{ sample?: string; rid?: string }>();
  // Qwen3 #4: deep link route guard
  const key = SAMPLE_KEYS.includes(rawKey) ? rawKey : 'withheld_blurry';
  const fallbackSample = getSampleByKey(key) ?? getSampleByKey('withheld_blurry')!;
  const [seen, setSeen] = useState<boolean | null>(null);
  const [realResult, setRealResult] = useState<RevealResult | null>(null);
  useEffect(() => {
    isPrivacySeen().then(setSeen);
    if (rid) loadResult(rid).then(setRealResult);
  }, [rid]);
  if (seen === false) return <Redirect href="/(onboarding)/privacy" />;
  if (seen === null) return null;
  const sample: RevealResult = realResult ?? fallbackSample;
  const isSampleFallback = !realResult;
  const reason = sample.withheld_reason ?? 'other';
  const body = WITHHELD_COPY[reason];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">About this photo</Text>
      </View>
      <View style={styles.body}>
        {isSampleFallback && (
          <View style={styles.sampleBadge} accessibilityRole="text">
            <Text style={styles.sampleBadgeLabel}>SAMPLE</Text>
            <Text style={styles.sampleBadgeBody}>Demo reveal — capture a meal photo to see your own analysis.</Text>
          </View>
        )}
        <View style={styles.card}>
          <View style={styles.warnIcon} accessibilityElementsHidden>
            <Text style={styles.warnIconText}>⚠</Text>
          </View>
          <Text style={styles.cardTitle} accessibilityRole="header">I held back this one.</Text>
          <Text style={styles.cardBody}>{body}</Text>
          <CTAButton
            label="Retake"
            variant="small"
            onPress={() => router.replace('/')}
            accessibilityLabel="Retake photo"
          />
          {/* "Add a label" feature is not yet implemented — button removed to avoid dummy interaction. */}
        </View>
        <Text style={styles.reassurance}>Mirrorbite never invents numbers it can't see.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s4, height: 44 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: colors.teal500, marginTop: -3 },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.ink900, marginRight: 36 },
  body: { flex: 1, alignItems: 'stretch', justifyContent: 'center', padding: spacing.s6 },
  card: {
    backgroundColor: colors.amber50,
    borderWidth: 1,
    borderColor: colors.amber200,
    borderRadius: radii.lg,
    padding: spacing.s7,
    alignItems: 'center',
    ...shadows.card,
  },
  warnIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.amber500,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.s3,
  },
  warnIconText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  cardTitle: { ...typography.titleLg, marginBottom: spacing.s3, color: colors.ink900 },
  cardBody: { ...typography.sub, marginBottom: spacing.s5, textAlign: 'center' },
  reassurance: { fontSize: 12, fontStyle: 'italic', color: colors.ink500, textAlign: 'center', marginTop: spacing.s5 },
  sampleBadge: {
    backgroundColor: colors.amber50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amber200,
    padding: spacing.s3,
    marginBottom: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  sampleBadgeLabel: {
    color: colors.amber700,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    backgroundColor: colors.amber200,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  sampleBadgeBody: { flex: 1, fontSize: 12, color: colors.amber700, lineHeight: 16 },
});
