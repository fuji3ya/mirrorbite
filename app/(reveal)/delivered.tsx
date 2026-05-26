import { Image as ExpoImage } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTAButton } from '@/components/CTAButton';
import { RevealCard } from '@/components/RevealCard';
import { SAMPLE_KEYS, getSampleByKey, type RevealResult } from '@/lib/gpt4-vision';
import { isPrivacySeen } from '@/lib/onboarding-state';
import { getLastCapture, loadResult } from '@/lib/reveal-state';
import { colors, radii, shadows, spacing } from '@/lib/theme';

export default function RevealDelivered() {
  const { sample: rawKey = 'delivered_caesar', rid } = useLocalSearchParams<{ sample?: string; rid?: string }>();
  // Qwen3 #4: deep link route guard — only allow whitelisted sample keys
  const key = SAMPLE_KEYS.includes(rawKey) ? rawKey : 'delivered_caesar';
  const fallbackSample = getSampleByKey(key) ?? getSampleByKey('delivered_caesar')!;
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [seen, setSeen] = useState<boolean | null>(null);
  const [realResult, setRealResult] = useState<RevealResult | null>(null);

  useEffect(() => {
    isPrivacySeen().then(setSeen);
    getLastCapture().then((c) => setThumbUri(c?.photoUri ?? null));
    if (rid) loadResult(rid).then(setRealResult);
  }, [rid]);

  // Prefer the real Worker response (stored under rid) over the sample fallback.
  const sample: RevealResult = realResult ?? fallbackSample;
  const isSampleFallback = !realResult;

  // Qwen3 #4: gate — if user landed here via deep link without seeing privacy frame, redirect
  if (seen === false) return <Redirect href="/(onboarding)/privacy" />;
  if (seen === null) return null;

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
        <Text style={styles.title} accessibilityRole="header">Today's plate</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.s6, paddingTop: 0 }}>
        {thumbUri && (
          <ExpoImage
            source={{ uri: thumbUri }}
            style={styles.thumb}
            contentFit="cover"
            accessibilityLabel="Your meal photo thumbnail"
          />
        )}
        {isSampleFallback && (
          <View style={styles.sampleBadge} accessibilityRole="text">
            <Text style={styles.sampleBadgeLabel}>SAMPLE</Text>
            <Text style={styles.sampleBadgeBody}>Demo reveal — capture a meal photo to see your own analysis.</Text>
          </View>
        )}
        <RevealCard sample={sample} />
        <View style={styles.actions}>
          {sample.next_action_cta && (
            <Text style={styles.nextHint} accessibilityRole="text">
              <Text style={styles.nextHintLabel}>NEXT: </Text>
              {sample.next_action_cta}
            </Text>
          )}
          <CTAButton
            label="Done"
            onPress={() => router.replace('/')}
            accessibilityLabel="Done, back to camera"
          />
          <Text style={styles.disclaimer}>Directional only. Not medical advice.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.s4, height: 44 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  backIcon: { fontSize: 24, color: colors.teal500, marginTop: -3 },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.ink900, marginRight: 36 },
  thumb: { width: 42, height: 42, borderRadius: radii.md, marginVertical: spacing.s2, ...shadows.card },
  sampleBadge: {
    backgroundColor: colors.amber50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.amber200,
    padding: spacing.s3,
    marginBottom: spacing.s3,
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
  sampleBadgeBody: {
    flex: 1,
    fontSize: 12,
    color: colors.amber700,
    lineHeight: 16,
  },
  actions: { marginTop: spacing.s4 },
  nextHint: {
    textAlign: 'center',
    marginBottom: spacing.s3,
    fontSize: 13,
    color: colors.ink700,
    lineHeight: 18,
  },
  nextHintLabel: {
    color: colors.teal700,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  disclaimer: { textAlign: 'center', marginTop: spacing.s3, fontSize: 11, color: colors.ink400 },
});
