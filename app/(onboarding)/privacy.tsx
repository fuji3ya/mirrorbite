/**
 * Mirrorbite — Frame 0: Two promises before we start (Privacy)
 *
 * Day 4 ゲート 4 (hallucination 不安払拭) の起点。
 * reassurance line "We never invent numbers we can't see." を Reveal-withheld / Paywall と完全一致。
 *
 * spec: onboarding-3act-spec.md §1
 */

import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTAButton } from '@/components/CTAButton';
import { markPrivacySeen, loadOnboardingState, saveOnboardingState } from '@/lib/onboarding-state';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';

export default function PrivacyScreen() {
  const onContinue = async () => {
    await markPrivacySeen();
    const state = await loadOnboardingState();
    await saveOnboardingState({ ...state, step: 'a1_goal' });
    router.push('/(onboarding)/a1-goal');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.shieldWrap}>
          <View style={styles.shield}>
            <Text style={styles.shieldIcon}>✓</Text>
          </View>
        </View>

        <Text style={styles.title}>
          Two promises{'\n'}before we start
        </Text>

        <View style={styles.promises}>
          <View style={styles.promise}>
            <View style={styles.chk}><Text style={styles.chkIcon}>✓</Text></View>
            <Text style={styles.promiseText}>
              Your photo is encrypted in transit, analyzed once, then deleted from our server.
              We never store images or use them to train models.
            </Text>
          </View>
          <View style={styles.promise}>
            <View style={styles.chk}><Text style={styles.chkIcon}>✓</Text></View>
            <Text style={styles.promiseText}>
              We never invent numbers we can't see. When we're not sure, we say so.
            </Text>
          </View>
          <View style={styles.promise}>
            <View style={styles.chk}><Text style={styles.chkIcon}>✓</Text></View>
            <Text style={styles.promiseText}>
              Directional feedback only. Mirrorbite is not medical advice and not a substitute
              for a registered dietitian.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <CTAButton label="Got it" onPress={onContinue} accessibilityLabel="Accept and continue" />
        <Pressable
          style={styles.linkWrap}
          onPress={() => Linking.openURL('https://mirrorbite.starving-effort.com/privacy')}
          accessibilityRole="link"
          accessibilityLabel="Read the full privacy policy"
        >
          <Text style={styles.link}>Read the full policy</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.s6,
    paddingTop: spacing.s5,
  },
  shieldWrap: {
    alignItems: 'center',
    marginTop: spacing.s3,
    marginBottom: spacing.s5,
  },
  shield: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.teal500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.ctaGlow,
  },
  shieldIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  title: {
    ...typography.titleXL,
    textAlign: 'center',
    marginTop: spacing.s3,
    color: colors.ink900,
  },
  promises: {
    marginTop: spacing.s8,
    gap: spacing.s4,
  },
  promise: {
    flexDirection: 'row',
    gap: spacing.s3,
    padding: spacing.s3,
    borderRadius: radii.md,
    backgroundColor: colors.ink50,
  },
  chk: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.teal500,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  chkIcon: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  promiseText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink800,
    letterSpacing: -0.15,
  },
  footer: {
    paddingHorizontal: spacing.s6,
    paddingBottom: spacing.s6,
  },
  linkWrap: {
    alignItems: 'center',
    paddingVertical: spacing.s2,
    marginTop: spacing.s2,
  },
  link: {
    color: colors.teal700,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
