/**
 * Mirrorbite — HARD Paywall (Mau Prayer Lock 構成)
 * Day 5-7 ship では UI のみ、Day 6 で RevenueCat + Superwall 接続
 *
 * 価格: $6.99/週 + $39.99/年 (Mau Lazymaxxers Prayer Lock パターン準拠)
 * close X は 5 秒後表示 (Apple HIG)
 */

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTAButton } from '@/components/CTAButton';
import { getPlanPrices, initPurchases, purchasePlan, restorePurchases } from '@/lib/purchases';
import { FREE_REVEALS_PER_MONTH, getFreeRevealsRemaining } from '@/lib/reveal-state';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';

const TERMS_URL = 'https://mirrorbite.starving-effort.com/terms';
const PRIVACY_URL = 'https://mirrorbite.starving-effort.com/privacy';

interface Plan {
  id: 'annual' | 'weekly';
  title: string;
  sub: string;
  save?: string;
  popular?: boolean;
}

const DEFAULT_PLANS: Plan[] = [
  { id: 'annual', title: '$39.99 / year', sub: '$0.77 / week, billed yearly', save: 'Save 89%', popular: true },
  { id: 'weekly', title: '$6.99 / week', sub: 'billed every 7 days' },
];

export default function Paywall() {
  const [selected, setSelected] = useState<'annual' | 'weekly'>('annual');
  const [closeVisible, setCloseVisible] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(5);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);

  // Pull free-tier remaining so the hero can speak to the user's actual state.
  // Three messages:
  //   remaining > 0  → "You have N free reveals left this month."
  //   remaining = 0  → "You've used your 3 free reveals for this month."
  //   null (loading) → render default copy until we know.
  useEffect(() => {
    let alive = true;
    getFreeRevealsRemaining().then((n) => alive && setFreeRemaining(n));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initPurchases();
      try {
        const p = await getPlanPrices();
        if (!cancelled) {
          setPlans([
            { id: 'annual', title: p.annual, sub: 'billed yearly', save: 'Save 89%', popular: true },
            { id: 'weekly', title: p.weekly, sub: 'billed every 7 days' },
          ]);
        }
      } catch {
        // fall back to DEFAULT_PLANS already in state
      }
    })();
    const interval = setInterval(() => {
      setCloseCountdown((c) => {
        if (c <= 1) {
          setCloseVisible(true);
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const [busy, setBusy] = useState(false);

  const onPurchase = async () => {
    if (busy) return; // ignore double-tap while StoreKit dialog is in flight
    setBusy(true);
    try {
      const ok = await purchasePlan(selected);
      if (ok) router.replace('/');
    } finally {
      setBusy(false);
    }
  };
  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await restorePurchases();
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };
  const onClose = () => {
    if (busy) return;
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.root}>
      {closeVisible ? (
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close paywall"
        >
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      ) : (
        <View
          style={styles.closeBtnPending}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={styles.closeIconPending}>{closeCountdown}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MIRRORBITE PRO</Text>
          <Text style={styles.title}>
            {freeRemaining === 0
              ? `You've used your ${FREE_REVEALS_PER_MONTH} free\nreveals this month`
              : 'Start your\ndaily reveal'}
          </Text>
          {freeRemaining !== null && freeRemaining > 0 && (
            <Text style={styles.heroSub}>
              {freeRemaining} of {FREE_REVEALS_PER_MONTH} free reveals left this month — go unlimited
            </Text>
          )}
          {freeRemaining === 0 && (
            <Text style={styles.heroSub}>Unlock unlimited reveals — no waiting until next month</Text>
          )}
        </View>
        <View style={styles.bullets}>
          {[
            'One photo → 60-second read',
            'No grams. No invented numbers',
            'Directional feedback, every day',
          ].map((b) => (
            <View key={b} style={styles.bullet}>
              <View style={styles.bulletChk}><Text style={styles.bulletChkIcon}>✓</Text></View>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
        <View style={styles.plans}>
          {plans.map((p) => {
            const sel = selected === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelected(p.id)}
                style={[styles.planCard, sel && styles.planSel]}
              >
                {p.popular && <Text style={styles.popular}>MOST POPULAR</Text>}
                <View style={[styles.radio, sel && styles.radioSel]}>
                  {sel && <View style={styles.radioDot} />}
                </View>
                <View style={styles.planMain}>
                  <Text style={styles.planTitle}>{p.title}</Text>
                  <Text style={styles.planSub}>{p.sub}</Text>
                </View>
                {p.save && <Text style={styles.saveBadge}>{p.save}</Text>}
              </Pressable>
            );
          })}
        </View>
        <CTAButton
          label={busy ? 'Processing…' : 'Start Now'}
          onPress={onPurchase}
          disabled={busy}
          accessibilityLabel={`Start Mirrorbite Pro, ${plans.find((p) => p.id === selected)?.title ?? ''}`}
          accessibilityState={{ disabled: busy, busy }}
        />
        <Pressable
          style={styles.restore}
          onPress={onRestore}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchases"
        >
          <Text style={styles.restoreText}>Restore purchases</Text>
        </Pressable>

        <Text style={styles.disclosure} accessibilityRole="text">
          Mirrorbite Pro is an auto-renewable subscription. Your selected plan
          ({plans.find((p) => p.id === selected)?.title ?? ''}) will be charged
          to your Apple ID at confirmation of purchase. Subscription
          automatically renews unless canceled at least 24 hours before the end
          of the current period. Your Apple ID account will be charged for
          renewal within 24 hours prior to the end of the current period.
          Manage and cancel anytime in Settings → Apple ID → Subscriptions.
        </Text>

        <View style={styles.linkRow}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
            <Text style={styles.linkText}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.linkSep}>·</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  closeBtn: { position: 'absolute', top: 60, right: 18, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  closeIcon: { fontSize: 20, color: colors.ink700, marginTop: -2 },
  closeBtnPending: { position: 'absolute', top: 60, right: 18, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  closeIconPending: { fontSize: 13, color: colors.ink400, fontWeight: '600' },
  body: { padding: spacing.s6 },
  hero: { alignItems: 'center', paddingTop: spacing.s4, paddingBottom: spacing.s5 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: colors.teal600, marginBottom: spacing.s3 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink900, textAlign: 'center', lineHeight: 33, letterSpacing: -0.7 },
  heroSub: { fontSize: 13, fontWeight: '600', color: colors.ink700, textAlign: 'center', marginTop: spacing.s3, paddingHorizontal: spacing.s5 },
  bullets: { gap: 12, marginBottom: spacing.s6 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletChk: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.teal100, alignItems: 'center', justifyContent: 'center' },
  bulletChkIcon: { color: colors.teal700, fontWeight: '900', fontSize: 12 },
  bulletText: { fontSize: 14, color: colors.ink700, letterSpacing: -0.15 },
  plans: { gap: 10, marginBottom: spacing.s4 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.canvas,
    borderWidth: 1.5,
    borderColor: colors.ink100,
    borderRadius: radii.lg,
    padding: 16,
    position: 'relative',
  },
  planSel: { borderColor: colors.teal500, backgroundColor: colors.teal50, ...shadows.cardElevated },
  popular: { position: 'absolute', top: -9, right: 16, backgroundColor: colors.teal700, color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.ink300, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: colors.teal500, backgroundColor: colors.teal500 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  planMain: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: '700', color: colors.ink900, letterSpacing: -0.25 },
  planSub: { fontSize: 12, color: colors.ink500, marginTop: 2 },
  saveBadge: { backgroundColor: colors.teal700, color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  restore: { alignSelf: 'center', paddingVertical: spacing.s3, paddingHorizontal: spacing.s5, minHeight: 44, justifyContent: 'center', marginTop: spacing.s3 },
  restoreText: { color: colors.ink500, fontSize: 15, fontWeight: '600' },
  disclosure: {
    fontSize: 11,
    color: colors.ink500,
    textAlign: 'left',
    lineHeight: 16,
    paddingHorizontal: spacing.s2,
    marginTop: spacing.s4,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.s3,
  },
  linkText: { color: colors.teal700, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline', paddingVertical: 8, paddingHorizontal: 4 },
  linkSep: { color: colors.ink400, fontSize: 12 },
});
