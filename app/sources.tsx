/**
 * Mirrorbite — In-app Nutrition Sources & Citations
 *
 * App Store Guideline 1.4.1 requires citations for health/nutrition guidance to
 * be present IN THE APP and easy to find. This native screen renders the same
 * authoritative sources as the web /sources page so a reviewer (and user) never
 * has to leave the app to trace the basis of the feedback. Reachable from the
 * "not medical advice · Sources" disclaimer on the result, home, and settings
 * screens.
 */

import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/lib/theme';

type Source = { title: string; org: string; url: string };

const SOURCES: Source[] = [
  {
    title: 'Dietary Guidelines for Americans, 2020–2025',
    org: 'U.S. Departments of Agriculture and Health & Human Services',
    url: 'https://www.dietaryguidelines.gov',
  },
  {
    title: 'Healthy Eating Plate',
    org: 'Harvard T.H. Chan School of Public Health — The Nutrition Source',
    url: 'https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/',
  },
  {
    title: 'Healthy diet — Fact sheet',
    org: 'World Health Organization (WHO)',
    url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
  },
  {
    title: 'Dietary fiber — Dietary Reference Intakes',
    org: 'National Academies of Sciences, Engineering, and Medicine',
    url: 'https://www.nationalacademies.org',
  },
];

export default function SourcesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition sources</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close sources"
        >
          <Text style={styles.close}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Directional, not medical advice. Mirrorbite gives a categorical read of a meal — it never
            reports gram or calorie numbers and is not a substitute for a registered dietitian or
            licensed health professional.
          </Text>
        </View>

        <Text style={styles.h2}>The principles behind our feedback</Text>
        <Text style={styles.p}>
          Mirrorbite's "good / caution / low" axes and its one-line suggestions reflect widely
          published, consensus public-health guidance on balanced eating — adequate lean protein, a
          balance of carbohydrate sources, and sufficient dietary fiber and vegetables. We do not
          invent numbers or make individualized medical claims.
        </Text>

        <Text style={styles.h2}>Primary sources</Text>
        {SOURCES.map((s) => (
          <Pressable
            key={s.url}
            style={styles.sourceRow}
            onPress={() => Linking.openURL(s.url)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${s.title} — ${s.org}`}
          >
            <View style={styles.sourceTextWrap}>
              <Text style={styles.sourceTitle}>{s.title}</Text>
              <Text style={styles.sourceOrg}>{s.org}</Text>
            </View>
            <Text style={styles.sourceArrow}>↗</Text>
          </Pressable>
        ))}

        <Text style={styles.h2}>On the accuracy of photo-based estimates</Text>
        <Text style={styles.p}>
          Independent research has repeatedly shown that estimating nutrition from a single photo
          carries a wide margin of error (commonly cited at roughly ±30% or more). This is exactly
          why Mirrorbite stays directional — categorical bands and qualitative suggestions — instead
          of presenting false-precision calorie or gram figures, and why we hold back a result when a
          photo can't be read clearly.
        </Text>

        <Text style={styles.footer}>
          These citations are provided so the guidance in the app can be traced to its public-health
          sources, in line with App Store Review Guideline 1.4.1. Questions? Email
          hello@starving-effort.com.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ink100,
  },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: colors.ink900 },
  close: { fontSize: 16, fontWeight: '600', color: colors.teal600 },
  body: { padding: spacing.s5, paddingBottom: spacing.s8 },
  callout: {
    backgroundColor: colors.teal50,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal500,
    borderRadius: radii.md,
    padding: spacing.s4,
    marginBottom: spacing.s5,
  },
  calloutText: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
  h2: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.ink900,
    marginTop: spacing.s5,
    marginBottom: spacing.s2,
  },
  p: { fontSize: 15, lineHeight: 22, color: colors.ink600 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ink100,
  },
  sourceTextWrap: { flex: 1, paddingRight: spacing.s3 },
  sourceTitle: { fontSize: 15, fontWeight: '600', color: colors.ink800, marginBottom: 2 },
  sourceOrg: { fontSize: 13, lineHeight: 18, color: colors.ink500 },
  sourceArrow: { fontSize: 18, color: colors.teal600 },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink400,
    marginTop: spacing.s6,
  },
});
