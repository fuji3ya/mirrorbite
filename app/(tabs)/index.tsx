/**
 * Mirrorbite v1.1 — Home tab (default landing).
 *
 * Brand-led TOP page that frames the day before the user dives into Camera.
 * Hero: app icon + wordmark + "Today" date.
 * Cards: today's reveal preview / streak / free quota / Snap CTA.
 * Footer: recent reveals horizontal strip + library shortcut.
 *
 * Camera tab is one tap away — Home is the calm entry, not the action surface.
 */

import { Image as ExpoImage } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isPro } from '@/lib/purchases';
import {
  formatAgo,
  FREE_REVEALS_PER_MONTH,
  getFreeRevealsRemaining,
  loadAllResults,
  loadHistory,
  type HistoryEntry,
} from '@/lib/reveal-state';
import { colors, radii, shadows, spacing } from '@/lib/theme';

// Brand hero — full-bleed pre-rendered image with wordmark + bitten plate
// baked into a teal background. Source 800x1003 (aspect 0.797), cropped from
// the ChatGPT gpt-image-2 design so empty padding is minimized. Display at
// fixed height ~460pt so it occupies the top half of an iPhone screen,
// matching the reference design comp.
const BRAND_HERO = require('@/assets/images/brand-hero.jpg');

export default function HomeScreen() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [freeRemaining, setFreeRemaining] = useState<number>(FREE_REVEALS_PER_MONTH);
  const [pro, setPro] = useState<boolean>(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastDish, setLastDish] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [h, n, p, results] = await Promise.all([
          loadHistory(),
          getFreeRevealsRemaining(),
          isPro(),
          loadAllResults(),
        ]);
        if (cancelled) return;
        setHistory(h);
        setFreeRemaining(n);
        setPro(p);
        const mostRecentDelivered = h.find((e) => !(e.sampleKey ?? '').startsWith('withheld'));
        if (mostRecentDelivered?.resultId) {
          const r = results[mostRecentDelivered.resultId];
          setLastScore(r?.score ?? null);
          setLastDish(r?.identified_dish ?? mostRecentDelivered.dish ?? null);
        } else {
          setLastScore(null);
          setLastDish(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const streakDays = Math.min(history.length, 30);

  const goCamera = () => router.push('/(tabs)/camera');
  const goLibrary = () => router.push('/(tabs)/library');
  const goPaywall = () => router.push('/paywall');

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* === Brand hero (full-bleed image: wordmark + bitten plate on teal) === */}
        <Image
          source={BRAND_HERO}
          style={styles.brandHero}
          resizeMode="cover"
          accessibilityRole="header"
          accessibilityLabel="Mirrorbite — Honest food reveal in 60s"
        />

        <Text style={styles.today}>{today}</Text>

        <View style={styles.belowHero}>
        {/* === Status pills === */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, pro ? styles.pillPro : styles.pillFree]}>
            <Text style={[styles.pillText, pro ? styles.pillTextPro : styles.pillTextFree]}>
              {pro ? 'PRO · UNLIMITED' : `FREE · ${freeRemaining}/${FREE_REVEALS_PER_MONTH}`}
            </Text>
          </View>
          {streakDays > 0 && (
            <View style={styles.pillStreak}>
              <Text style={styles.pillStreakEmoji}>🔥</Text>
              <Text style={styles.pillStreakText}>
                {streakDays} {streakDays === 1 ? 'reveal' : 'reveals'}
              </Text>
            </View>
          )}
        </View>

        {/* === Today's read preview === */}
        {lastScore !== null && (
          <View style={styles.lastCard}>
            <Text style={styles.lastEyebrow}>YOUR LAST READ</Text>
            <View style={styles.lastBody}>
              <Text style={styles.lastScore}>{lastScore}</Text>
              <View style={styles.lastMeta}>
                <Text style={styles.lastDish} numberOfLines={1}>{lastDish ?? 'Past meal'}</Text>
                <Text style={styles.lastAgo}>{history[0] ? formatAgo(history[0].ts) : ''} · /100 directional</Text>
              </View>
            </View>
          </View>
        )}

        {/* === Hero CTA === */}
        <Pressable
          onPress={goCamera}
          style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Snap a meal — open camera"
        >
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>📸</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>Snap a meal</Text>
            <Text style={styles.heroSub}>~60 seconds to a directional read</Text>
          </View>
          <Text style={styles.heroChev}>›</Text>
        </Pressable>

        {/* === Free tier soft upsell (only when 0 remaining and not pro) === */}
        {!pro && freeRemaining === 0 && (
          <Pressable
            onPress={goPaywall}
            style={styles.upsellCard}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro for unlimited reveals"
          >
            <Text style={styles.upsellEyebrow}>OUT OF FREE REVEALS</Text>
            <Text style={styles.upsellTitle}>Go unlimited — no waiting until next month.</Text>
            <Text style={styles.upsellChev}>See plans ›</Text>
          </Pressable>
        )}

        {/* === Recent strip === */}
        {history.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentLabel}>RECENT</Text>
              <Pressable onPress={goLibrary} accessibilityRole="link" accessibilityLabel="See all reveals in Library">
                <Text style={styles.recentSeeAll}>See all ›</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentStrip}>
              {history.slice(0, 8).map((h) => (
                <Pressable
                  key={h.id}
                  onPress={goLibrary}
                  style={styles.recentThumb}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${h.dish ?? 'past meal'} in Library`}
                >
                  <ExpoImage source={{ uri: h.photoUri }} style={styles.recentImg} contentFit="cover" />
                  <Text style={styles.recentAgo}>{formatAgo(h.ts)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.footerDisclaimer}>
          Directional only. Mirrorbite is not medical advice.
        </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingBottom: spacing.s8 },
  // Inner padding for everything BELOW the full-bleed hero.
  belowHero: { paddingHorizontal: spacing.s5 },

  // Brand hero — full-bleed image. Fixed 460pt height so it occupies the
  // top half of an iPhone screen. Source aspect (0.797 = portrait) is close
  // enough to container aspect (~0.85 on iPhone 390pt × 460pt) that cover
  // shows almost the entire image with only minimal vertical crop.
  brandHero: { width: '100%', height: 460, backgroundColor: '#3DB8A8' },
  today: { fontSize: 12, color: colors.ink400, fontWeight: '600', marginTop: spacing.s4, marginHorizontal: spacing.s5, letterSpacing: 0.4, textTransform: 'uppercase' },

  // Pills
  pillRow: { flexDirection: 'row', gap: 8, marginTop: spacing.s2, marginBottom: spacing.s4 },
  pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill },
  pillPro: { backgroundColor: colors.teal100 },
  pillFree: { backgroundColor: colors.amber100 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pillTextPro: { color: colors.teal700 },
  pillTextFree: { color: colors.amber700 },
  pillStreak: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, paddingLeft: 10, borderRadius: radii.pill, backgroundColor: colors.ink50 },
  pillStreakEmoji: { fontSize: 13 },
  pillStreakText: { fontSize: 12, fontWeight: '700', color: colors.ink700, letterSpacing: -0.1 },

  // Last read card
  lastCard: { backgroundColor: colors.teal50, borderRadius: radii.lg, padding: spacing.s4, marginBottom: spacing.s4 },
  lastEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.teal700 },
  lastBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.s4, marginTop: spacing.s3 },
  lastScore: { fontSize: 44, fontWeight: '800', color: colors.ink900, letterSpacing: -2, lineHeight: 48 },
  lastMeta: { flex: 1 },
  lastDish: { fontSize: 15, fontWeight: '700', color: colors.ink900, letterSpacing: -0.2 },
  lastAgo: { fontSize: 11, color: colors.ink500, marginTop: 4 },

  // Hero CTA
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    backgroundColor: colors.teal500,
    borderRadius: radii.lg,
    padding: spacing.s4,
    ...shadows.ctaGlow,
    marginBottom: spacing.s3,
  },
  heroIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroIconText: { fontSize: 22 },
  heroBody: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, letterSpacing: -0.1 },
  heroChev: { color: '#fff', fontSize: 28, fontWeight: '300' },

  // Upsell
  upsellCard: { backgroundColor: colors.amber50, borderWidth: 1, borderColor: colors.amber200, borderRadius: radii.lg, padding: spacing.s4, marginBottom: spacing.s4 },
  upsellEyebrow: { fontSize: 10, fontWeight: '800', color: colors.amber700, letterSpacing: 1.5 },
  upsellTitle: { fontSize: 14, fontWeight: '700', color: colors.ink900, marginTop: 4, letterSpacing: -0.2 },
  upsellChev: { fontSize: 12, color: colors.teal700, fontWeight: '700', marginTop: spacing.s2 },

  // Recent strip
  recentSection: { marginTop: spacing.s2 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.s2 },
  recentLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.ink500 },
  recentSeeAll: { fontSize: 12, color: colors.teal700, fontWeight: '600' },
  recentStrip: { gap: 10, paddingRight: spacing.s4 },
  recentThumb: { width: 72, height: 72, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.ink100, justifyContent: 'flex-end', padding: 4, ...shadows.card },
  recentImg: { ...StyleSheet.absoluteFillObject },
  recentAgo: { fontSize: 9, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // Footer
  footerDisclaimer: { fontSize: 11, color: colors.ink400, textAlign: 'center', lineHeight: 16, marginTop: spacing.s5 },
});
