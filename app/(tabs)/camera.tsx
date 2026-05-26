/**
 * Mirrorbite — Camera home (post-onboarding)
 *
 * - expo-camera で live viewfinder (back-camera 1:1)
 * - shutter → takePictureAsync → setLastCapture → /(camera)/processing
 * - expo-image-picker でライブラリ選択も対応
 * - history (max 4) を AsyncStorage から復元
 * - permission denied / library mode 時の fallback UI
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { stripPhotoMetadata } from '@/lib/image-privacy';
import { isPro } from '@/lib/purchases';
import {
  formatAgo,
  FREE_REVEALS_PER_MONTH,
  getFreeRevealsRemaining,
  loadHistory,
  setLastCapture,
  type HistoryEntry,
} from '@/lib/reveal-state';

const REVIEW_MODE = process.env.EXPO_PUBLIC_REVIEW_MODE === '1';
import { colors, radii, shadows, spacing } from '@/lib/theme';

const PLACEHOLDER_COLORS = ['#94c69a', '#d9a76b', '#a591c8', colors.amber100];

export default function CameraHome() {
  const camRef = useRef<CameraView>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [freeRemaining, setFreeRemaining] = useState<number>(FREE_REVEALS_PER_MONTH);
  const [pro, setPro] = useState<boolean>(false);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  // Refresh Pro status + free quota on focus.
  // Called on mount, after returning from paywall, and after a reveal completes
  // (processing.tsx pushes back here after incrementing the count).
  const refreshEntitlement = async () => {
    const [p, n] = await Promise.all([isPro(), getFreeRevealsRemaining()]);
    setPro(p);
    setFreeRemaining(n);
  };

  useEffect(() => {
    refreshEntitlement();
  }, []);

  // Request camera permission on mount so the preview can render immediately.
  // Without this, perm.granted stays null and the fallback "Camera unavailable"
  // shows until the user taps shutter, which is confusing on first launch.
  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) {
      requestPerm();
    }
  }, [perm?.granted, perm?.canAskAgain]);

  /**
   * Gate the camera/library actions. Order of precedence:
   *   1. REVIEW_MODE       — Apple reviewer build, full bypass
   *   2. Pro subscription  — RC entitlement `pro` active
   *   3. Free quota        — FREE_REVEALS_PER_MONTH / calendar month
   *   4. Otherwise         — push paywall and return false
   *
   * The free count is incremented only on DELIVERED reveals (in processing.tsx),
   * so a "withheld" outcome does not consume a free credit.
   *
   * Apple Guideline 3.1.2(a): the subscription must still gate a meaningful
   * value — unlimited reveals + history beyond the free quota is the value gate.
   */
  const ensureEntitled = async (): Promise<boolean> => {
    if (REVIEW_MODE) return true;
    if (await isPro()) return true;
    const remaining = await getFreeRevealsRemaining();
    if (remaining > 0) return true;
    router.push('/paywall');
    return false;
  };

  const onShutter = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      if (!(await ensureEntitled())) return;
      if (!perm?.granted) {
        const p = await requestPerm();
        if (!p.granted) { onLibrary(); return; }
      }
      // Light tactile feedback so the user knows the tap registered.
      // Fire-and-forget — Haptics.impactAsync is iOS-only at v15 and safe on Android (no-op).
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const photo = await camRef.current?.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
        exif: false, // do not request EXIF — even captures should be metadata-clean
      });
      if (!photo?.uri) return;
      // Privacy guarantee: strip EXIF/GPS/orientation/camera-model before any persist or network call.
      const safeUri = await stripPhotoMetadata(photo.uri);
      await setLastCapture(safeUri);
      router.push('/(camera)/processing');
    } catch (e) {
      console.warn('shutter failed', e);
      onLibrary();
    } finally {
      setCapturing(false);
    }
  };

  const onLibrary = async () => {
    if (!(await ensureEntitled())) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
      exif: false, // do not include EXIF in the picker result either
    });
    if (r.canceled || !r.assets?.[0]?.uri) return;
    // Library photos almost always contain GPS — strip before persist or network.
    const safeUri = await stripPhotoMetadata(r.assets[0].uri);
    await setLastCapture(safeUri);
    router.push('/(camera)/processing');
  };

  const streakDays = Math.min(history.length, 7);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.tophdr}>
        <Text style={styles.day} accessibilityRole="header">Today</Text>
        <View style={styles.tophdrRight}>
          {streakDays > 0 && (
            <View style={styles.streak} accessibilityLabel={`${streakDays} reveals in your history`}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakLabel}>
                {streakDays} {streakDays === 1 ? 'reveal' : 'reveals'}
              </Text>
            </View>
          )}
          {!pro && !REVIEW_MODE && (
            <Pressable
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel={`${freeRemaining} of ${FREE_REVEALS_PER_MONTH} free reveals remaining this month. Tap to subscribe for unlimited.`}
              style={styles.freeChip}
            >
              <Text style={styles.freeChipLabel}>
                Free {freeRemaining}/{FREE_REVEALS_PER_MONTH}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.viewfinder}>
          {perm?.granted ? (
            <CameraView
              ref={camRef}
              facing="back"
              style={StyleSheet.absoluteFillObject}
              animateShutter={false}
            />
          ) : (
            <View style={styles.permFallback}>
              <Text style={styles.permTitle}>Camera unavailable.</Text>
              <Text style={styles.permBody}>Use Choose from library below.</Text>
            </View>
          )}
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        <Text style={styles.caption}>Snap your meal. We'll do the rest in 60s.</Text>

        <View style={styles.shutterWrap}>
          <Pressable
            onPress={onShutter}
            style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
            disabled={capturing}
            accessibilityRole="button"
            accessibilityLabel="Capture meal photo"
            accessibilityState={{ disabled: capturing }}
          />
        </View>

        <Pressable
          onPress={onLibrary}
          style={styles.libBtn}
          accessibilityRole="button"
          accessibilityLabel="Choose photo from library"
        >
          <Text style={styles.libLabel}>Choose from library</Text>
        </Pressable>

        {history.length > 0 ? (
          <View style={styles.history}>
            {[0, 1, 2, 3].map((i) => {
              const h = history[i];
              const placeholder = PLACEHOLDER_COLORS[i];
              if (!h) {
                return (
                  <View
                    key={i}
                    style={[styles.thumb, styles.thumbEmpty, { backgroundColor: placeholder }]}
                    accessibilityElementsHidden
                  />
                );
              }
              const target = (h.sampleKey ?? '').startsWith('withheld') ? '/(reveal)/withheld' : '/(reveal)/delivered';
              const ridParam = h.resultId ? `&rid=${h.resultId}` : '';
              return (
                <Pressable
                  key={i}
                  style={[styles.thumb, { backgroundColor: placeholder }]}
                  onPress={async () => {
                    await setLastCapture(h.photoUri, h.sampleKey ?? undefined);
                    router.push(`${target}?sample=${h.sampleKey ?? 'delivered_caesar'}${ridParam}` as any);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${h.dish ?? 'past meal'}, ${formatAgo(h.ts)}`}
                >
                  <Image source={{ uri: h.photoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <Text style={styles.thumbAgo}>{formatAgo(h.ts)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyHistoryHint} accessibilityRole="text">
            Your past reveals will appear here.
          </Text>
        )}

        {history.length > 4 && (
          <Pressable
            onPress={() => router.push('/(tabs)/library')}
            style={styles.libraryLink}
            accessibilityRole="link"
            accessibilityLabel={`See all ${history.length} reveals in Library`}
          >
            <Text style={styles.libraryLinkText}>See all {history.length} in Library →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  tophdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.s6, paddingTop: spacing.s2 },
  day: { fontSize: 16, fontWeight: '600', color: colors.ink900, letterSpacing: -0.3 },
  tophdrRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.teal100, paddingVertical: 6, paddingHorizontal: 12, paddingLeft: 8, borderRadius: radii.pill },
  streakEmoji: { fontSize: 14 },
  streakLabel: { fontSize: 13, fontWeight: '700', color: colors.teal700, letterSpacing: -0.1 },
  freeChip: { backgroundColor: colors.amber100, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill },
  freeChipLabel: { fontSize: 13, fontWeight: '700', color: colors.ink900, letterSpacing: -0.1 },
  body: { flex: 1, padding: spacing.s6 },
  viewfinder: { aspectRatio: 1, borderRadius: radii.xl, backgroundColor: '#1A1D24', overflow: 'hidden', marginVertical: spacing.s2, position: 'relative' },
  permFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
  permTitle: { color: colors.teal400, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  permBody: { color: '#fff', opacity: 0.8, fontSize: 13, textAlign: 'center' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: 'rgba(255,255,255,0.6)' },
  cornerTL: { top: 18, left: 18, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 6 },
  cornerTR: { top: 18, right: 18, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 6 },
  cornerBL: { bottom: 18, left: 18, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 18, right: 18, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 6 },
  caption: { textAlign: 'center', fontSize: 15, color: colors.ink700, marginTop: spacing.s4 },
  shutterWrap: { alignItems: 'center', paddingVertical: spacing.s3 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.teal500, borderWidth: 5, borderColor: colors.canvas, ...shadows.ctaGlow },
  libBtn: { alignSelf: 'center', paddingVertical: spacing.s3, paddingHorizontal: spacing.s5, minHeight: 44, justifyContent: 'center' },
  libLabel: { color: colors.teal500, fontSize: 15, fontWeight: '600' },
  history: { flexDirection: 'row', gap: 10, marginTop: spacing.s3 },
  thumb: { flex: 1, aspectRatio: 1, borderRadius: radii.md, overflow: 'hidden', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 5, ...shadows.card },
  thumbEmpty: { opacity: 0.35 },
  thumbAgo: { fontSize: 9, fontWeight: '700', color: '#fff' },
  emptyHistoryHint: {
    fontSize: 12,
    color: colors.ink400,
    textAlign: 'center',
    marginTop: spacing.s4,
    fontStyle: 'italic',
  },
  libraryLink: { alignSelf: 'center', marginTop: spacing.s4, paddingVertical: spacing.s2, paddingHorizontal: spacing.s4, minHeight: 44, justifyContent: 'center' },
  libraryLinkText: { color: colors.teal700, fontSize: 13, fontWeight: '600' },
});
