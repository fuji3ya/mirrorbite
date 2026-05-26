/**
 * Mirrorbite — Processing screen
 * 1) getLastCapture() で撮影画像 URI を取得
 * 2) analyzeMeal() で 1.5-3s 演出後 reveal へ自動遷移
 * 3) history に push (max 4 ring buffer)
 */

import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeMeal, AnalysisError, ConfigurationError, type RevealResult } from '@/lib/gpt4-vision';
import { stripAndEncodeForUpload } from '@/lib/image-privacy';
import { isPro } from '@/lib/purchases';
import {
  getLastCapture,
  incrementFreeRevealCount,
  pushHistory,
  saveResult,
  setLastCapture,
} from '@/lib/reveal-state';

const REVIEW_MODE = process.env.EXPO_PUBLIC_REVIEW_MODE === '1';
import { colors, radii, shadows, spacing } from '@/lib/theme';

function inferSampleKey(r: RevealResult): string {
  if (r.judgement === 'withheld') {
    if (r.withheld_reason === 'non_food') return 'withheld_nonfood';
    if (r.withheld_reason === 'multiple_meals') return 'withheld_multi';
    return 'withheld_blurry';
  }
  const d = r.identified_dish?.toLowerCase() ?? '';
  if (d.includes('ramen')) return 'delivered_ramen';
  if (d.includes('grain')) return 'delivered_lowconf';
  return 'delivered_caesar';
}

export default function Processing() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<null | { title: string; body: string; retryable: boolean }>(null);
  const [progressStep, setProgressStep] = useState(0); // 0=scanning, 1=strengths, 2=hook
  const [longWait, setLongWait] = useState(false);

  const run = async () => {
    setError(null);
    const last = await getLastCapture();
    if (last?.photoUri) setPhotoUri(last.photoUri);

    // 60s hard timeout so the spinner never hangs forever if the Worker stalls.
    // Gemini path completes in ~5s, Claude escalation in ~25s — 60s is generous
    // headroom while still surfacing a "couldn't reach our analysis server" toast
    // instead of leaving the user staring at an infinite progress bar.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      // The Worker expects a `data:image/jpeg;base64,...` data URL.
      // The captured photo is stored as a `file://` URI (from camera or library),
      // so we re-encode it to base64 right before POST. Without this the Worker's
      // parseImage falls back to "raw base64", garbage bytes go to Gemini → 502.
      let imageDataURL: string | undefined;
      if (last?.photoUri) {
        const encoded = await stripAndEncodeForUpload(last.photoUri);
        if (!encoded) {
          throw new AnalysisError('network', 'failed_to_encode_image');
        }
        imageDataURL = encoded;
      }

      const result = await analyzeMeal({ imageDataURL, signal: controller.signal });
      const sampleKey = inferSampleKey(result);
      const resultId = `r${Date.now()}`;

      // Persist the real Worker response so the reveal screen can render the
      // actual analysis instead of falling back to a hard-coded sample.
      await saveResult(resultId, result);

      // Free-tier quota: only DELIVERED reveals consume a free credit.
      // Withheld outcomes return the user's attempt — they got no value.
      // Pro users + reviewer (REVIEW_MODE) are exempt from any counting.
      if (result.judgement === 'delivered' && !REVIEW_MODE) {
        if (!(await isPro())) {
          await incrementFreeRevealCount();
        }
      }

      if (last?.photoUri) {
        await pushHistory({
          id: `h${Date.now()}`,
          ts: Date.now(),
          photoUri: last.photoUri,
          sampleKey,
          resultId,
          dish: result.identified_dish,
        });
        await setLastCapture(last.photoUri, sampleKey);
      }

      const target = result.judgement === 'withheld' ? '/(reveal)/withheld' : '/(reveal)/delivered';
      router.replace(`${target}?sample=${sampleKey}&rid=${resultId}` as any);
    } catch (e) {
      if (e instanceof ConfigurationError) {
        setError({
          title: "We can't analyze meals right now.",
          body: 'This build is missing its analysis configuration. Please update the app from the App Store.',
          retryable: false,
        });
      } else if (e instanceof AnalysisError) {
        const isTimeout = e.code === 'timeout';
        // 'server' = HTTP 5xx after Worker fallback ran out (i.e. true server
        // down). 'network' = no connection / DNS / encoding fail. Both UX:
        // retry. Specific 5xx for ambiguous-image cases is now handled
        // server-side by returning withheld 200, so we don't need an "image
        // couldn't be analyzed" path on the client.
        setError({
          title: isTimeout ? 'That took too long.' : "We couldn't reach our analysis server.",
          body: isTimeout
            ? 'Check your connection and try again. We never invent numbers we can\'t see.'
            : 'Check your connection and try again. We never invent numbers we can\'t see.',
          retryable: true,
        });
      } else {
        setError({
          title: 'Something went wrong.',
          body: 'Please try again. We never invent numbers we can\'t see.',
          retryable: true,
        });
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    let cancelled = false;
    // Animate the 3 progress dots in real time so users don't see a static fake.
    // Each step advances at ~3s — covers the typical Gemini call (under 10s).
    const t1 = setTimeout(() => !cancelled && setProgressStep(1), 3000);
    const t2 = setTimeout(() => !cancelled && setProgressStep(2), 6500);
    // After 10s, soften the title so a long Claude escalation doesn't feel broken.
    const t3 = setTimeout(() => !cancelled && setLongWait(true), 10000);
    (async () => {
      if (cancelled) return;
      await run();
    })();
    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.body}>
          <View style={[styles.photo, styles.photoPlaceholder]} accessibilityElementsHidden />
          <Text style={styles.title} accessibilityRole="header">{error.title}</Text>
          <Text style={[styles.disclaimer, { paddingHorizontal: spacing.s4 }]}>{error.body}</Text>
          {error.retryable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try again"
              onPress={run}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to camera"
            onPress={() => router.replace('/')}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>Back to camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        {photoUri ? (
          <ExpoImage source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]} />
        )}
        <Text style={styles.title}>
          {longWait ? 'Still reading — almost there…' : 'Reading your plate…'}
        </Text>
        <View style={styles.rows} accessibilityRole="progressbar" accessibilityLabel="Analyzing your meal photo">
          {[
            { label: 'Axes scanning' },
            { label: 'Strengths' },
            { label: 'Next-meal hook' },
          ].map((row, i) => {
            const isActive = i === progressStep;
            const isDone = i < progressStep;
            return (
              <View key={row.label} style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    isDone && styles.dotDone,
                    isActive && styles.dotActive,
                  ]}
                />
                <Text
                  style={[
                    styles.rowLabel,
                    (isDone || isActive) && { color: colors.ink900, fontWeight: '500' },
                  ]}
                >
                  {row.label}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.disclaimer}>
          Mirrorbite gives directional feedback,{'\n'}not medical advice.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  body: { flex: 1, alignItems: 'center', padding: spacing.s6, justifyContent: 'space-between' },
  photo: { width: 280, height: 280, borderRadius: radii.xl, marginTop: spacing.s5, ...shadows.cardElevated },
  photoPlaceholder: { backgroundColor: colors.teal100 },
  title: { fontSize: 18, fontWeight: '500', color: colors.ink900, marginVertical: spacing.s4 },
  rows: { gap: spacing.s3, alignItems: 'flex-start', minWidth: 220 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.ink200 },
  dotActive: { backgroundColor: colors.teal400, borderColor: colors.teal500 },
  dotDone: { backgroundColor: colors.teal500, borderColor: colors.teal500 },
  rowLabel: { fontSize: 14, color: colors.ink700 },
  disclaimer: { fontSize: 12, color: colors.ink500, textAlign: 'center', lineHeight: 18, marginBottom: spacing.s4 },
  retryBtn: {
    marginTop: spacing.s4,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.teal500,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { marginTop: spacing.s3, paddingVertical: 10, paddingHorizontal: 20 },
  backText: { color: colors.ink500, fontSize: 14, fontWeight: '600' },
});
