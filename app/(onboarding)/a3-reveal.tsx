/**
 * Mirrorbite — Act 3: Sample reveal (Onboarding 内 demo)
 *
 * UX: 実 photo を撮ってないので fake processing は user を混乱させる。
 * "Here's a sample reveal" を最初から transparent に出し、reveal を即表示。
 * 確認後 → paywall trigger。
 */
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CTAButton } from '@/components/CTAButton';
import { RevealCard } from '@/components/RevealCard';
import { loadOnboardingState, saveOnboardingState } from '@/lib/onboarding-state';
import { getSampleByKey } from '@/lib/gpt4-vision';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme';

// Bundled photographic sample so onboarding A3 reveals what an actual reveal
// looks like end-to-end — not just numbers floating in space. Generated via
// gpt-image-2, 800x800 JPEG quality 0.82, see generated/products/line_i/.../prompts.
const SAMPLE_CAESAR_IMAGE = require('@/assets/images/sample-caesar.jpg');

export default function A3RevealScreen() {
  const sample = getSampleByKey('delivered_caesar')!;

  const onContinue = async () => {
    const s = await loadOnboardingState();
    await saveOnboardingState({ ...s, step: 'paywall' });
    router.replace('/paywall');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.sampleBanner} accessibilityRole="text">
          <Text style={styles.sampleEyebrow}>SAMPLE</Text>
          <Text style={styles.sampleBody}>
            Here's what a reveal looks like. When it's your turn, this is what you'll see in ~60 seconds.
          </Text>
        </View>
        <ExpoImage
          source={SAMPLE_CAESAR_IMAGE}
          style={styles.samplePhoto}
          contentFit="cover"
          accessibilityLabel="Sample meal photo: chicken caesar salad in a white bowl"
        />
        <RevealCard sample={sample} />
        <View style={styles.cta}>
          <CTAButton
            label="Got it — your turn"
            onPress={onContinue}
            accessibilityLabel="Got it, continue to subscription"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  scroll: { padding: spacing.s6 },
  sampleBanner: {
    backgroundColor: colors.teal50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal100,
    padding: spacing.s3,
    marginBottom: spacing.s4,
  },
  sampleEyebrow: { ...typography.eyebrow, color: colors.teal700, marginBottom: 4 },
  sampleBody: { fontSize: 13, color: colors.ink700, lineHeight: 18 },
  samplePhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    marginBottom: spacing.s4,
    ...shadows.card,
  },
  cta: { marginTop: spacing.s5 },
});
