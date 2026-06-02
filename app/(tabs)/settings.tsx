/**
 * Mirrorbite v1.1 — Settings tab
 *
 * Houses:
 *   - Subscription status + Manage subscription deep link
 *   - Restore purchases (sticky one — Apple HIG)
 *   - Privacy Policy / Terms / Support links
 *   - Clear all app data (destructive, confirm dialog)
 *   - Build / version footer
 */

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isPro, restorePurchases } from '@/lib/purchases';
import { clearAllAppData } from '@/lib/reveal-state';
import { colors, radii, shadows, spacing } from '@/lib/theme';

const PRIVACY_URL = 'https://mirrorbite.starving-effort.com/privacy';
const TERMS_URL = 'https://mirrorbite.starving-effort.com/terms';
const SUPPORT_URL = 'https://mirrorbite.starving-effort.com/support';
const SOURCES_URL = 'https://mirrorbite.starving-effort.com/sources';
const SUPPORT_EMAIL = 'hello@starving-effort.com';

export default function SettingsScreen() {
  const [pro, setPro] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const p = await isPro();
        if (!cancelled) setPro(p);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const onManage = () => Linking.openURL('https://apps.apple.com/account/subscriptions');
  const onRestore = async () => {
    const ok = await restorePurchases();
    Alert.alert(
      ok ? 'Purchases restored' : 'No active subscription found',
      ok
        ? "You're back to Pro. Unlimited reveals are unlocked."
        : "We couldn't find a purchase tied to this Apple ID. If you subscribed on another device, sign into the same Apple ID and try again.",
    );
    if (ok) setPro(true);
  };
  const onClear = () => {
    Alert.alert(
      'Clear all app data?',
      'This removes your reveal history, onboarding choices, and cached results from this device. Your Apple ID subscription is not affected — cancel that separately in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllAppData();
            router.replace('/(onboarding)/privacy');
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber ?? '';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityRole="header">Settings</Text>

        {/* Subscription card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Subscription</Text>
            <View style={[styles.statusChip, pro ? styles.statusPro : styles.statusFree]}>
              <Text style={[styles.statusText, pro ? styles.statusTextPro : styles.statusTextFree]}>
                {pro ? 'PRO' : 'FREE'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardBody}>
            {pro
              ? 'Unlimited reveals. Auto-renews via your Apple ID.'
              : '3 free reveals per calendar month. Subscribe for unlimited.'}
          </Text>
          {pro ? (
            <Pressable onPress={onManage} style={styles.row} accessibilityRole="link" accessibilityLabel="Manage subscription in Apple ID Settings">
              <Text style={styles.rowLabel}>Manage subscription</Text>
              <Text style={styles.rowChevron}>›</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/paywall')} style={[styles.row, styles.rowAccent]} accessibilityRole="button" accessibilityLabel="Subscribe to Mirrorbite Pro">
              <Text style={[styles.rowLabel, styles.rowLabelAccent]}>Subscribe to Pro</Text>
              <Text style={[styles.rowChevron, styles.rowLabelAccent]}>›</Text>
            </Pressable>
          )}
          <Pressable onPress={onRestore} style={styles.row} accessibilityRole="button" accessibilityLabel="Restore previous purchases">
            <Text style={styles.rowLabel}>Restore purchases</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        </View>

        {/* Legal + support */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} style={styles.row} accessibilityRole="link" accessibilityLabel="Open Privacy Policy">
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.rowChevron}>↗</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} style={styles.row} accessibilityRole="link" accessibilityLabel="Open Terms of Service">
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Text style={styles.rowChevron}>↗</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(SOURCES_URL)} style={styles.row} accessibilityRole="link" accessibilityLabel="Open nutrition sources and citations">
            <Text style={styles.rowLabel}>Nutrition sources</Text>
            <Text style={styles.rowChevron}>↗</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(SUPPORT_URL)} style={styles.row} accessibilityRole="link" accessibilityLabel="Open support page">
            <Text style={styles.rowLabel}>Support</Text>
            <Text style={styles.rowChevron}>↗</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Mirrorbite%20support`)}
            style={styles.row}
            accessibilityRole="link"
            accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
          >
            <Text style={styles.rowLabel}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.rowChevron}>↗</Text>
          </Pressable>
        </View>

        {/* Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data</Text>
          <Pressable onPress={onClear} style={styles.row} accessibilityRole="button" accessibilityLabel="Clear all app data from this device">
            <Text style={[styles.rowLabel, styles.rowLabelDestructive]}>Clear all app data</Text>
            <Text style={[styles.rowChevron, styles.rowLabelDestructive]}>›</Text>
          </Pressable>
          <Text style={styles.dataNote}>
            Wipes local reveal history, onboarding, and cached results. Your Apple ID subscription is unaffected.
          </Text>
        </View>

        <Text style={styles.versionFooter}>
          Mirrorbite v{version}{build ? ` · build ${build}` : ''}
        </Text>
        <Text style={styles.disclaimer}>
          Directional feedback only. Mirrorbite is not medical advice and not a substitute for a registered dietitian.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  scroll: { padding: spacing.s4, paddingBottom: spacing.s8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink900, letterSpacing: -0.5, paddingHorizontal: spacing.s2, marginBottom: spacing.s4 },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    padding: spacing.s4,
    marginBottom: spacing.s3,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.s2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink900, letterSpacing: -0.2 },
  cardBody: { fontSize: 13, color: colors.ink500, lineHeight: 18, marginBottom: spacing.s3 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  statusPro: { backgroundColor: colors.teal100 },
  statusFree: { backgroundColor: colors.ink100 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  statusTextPro: { color: colors.teal700 },
  statusTextFree: { color: colors.ink500 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.ink100,
    minHeight: 44,
  },
  rowAccent: {},
  rowLabel: { fontSize: 15, color: colors.ink800, fontWeight: '500' },
  rowLabelAccent: { color: colors.teal700, fontWeight: '700' },
  rowLabelDestructive: { color: colors.red600 },
  rowChevron: { fontSize: 16, color: colors.ink300, fontWeight: '300' },
  dataNote: { fontSize: 11, color: colors.ink400, lineHeight: 16, marginTop: spacing.s2 },
  versionFooter: { textAlign: 'center', fontSize: 12, color: colors.ink400, marginTop: spacing.s5 },
  disclaimer: { textAlign: 'center', fontSize: 11, color: colors.ink400, lineHeight: 16, marginTop: spacing.s2, paddingHorizontal: spacing.s5 },
});
