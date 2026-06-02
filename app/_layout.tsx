/**
 * Mirrorbite v1.1 — Root Stack Layout
 *
 * Routes:
 *   (onboarding) — Frame 0 Privacy + Act 1-3 Goal/EatOut/Baseline/Mystery + Sample Reveal
 *   (tabs)       — Bottom tab nav: Camera / Library / Trends / Settings
 *   (camera)     — analysis (`processing`) lives here, presented over the tab bar
 *   (reveal)     — delivered / withheld
 *   paywall      — RevenueCat-backed paywall (mb_weekly_v1 / mb_annual_v1, entitlement `pro`).
 *                  Not a group route — uses URL `/paywall` so it doesn't compete
 *                  with (tabs)/index for `/`.
 *
 * spec: generated/research/mirrorbite/day2-buildup/onboarding-3act-spec.md
 */

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  // Tabs is the default route at "/"; onboarding gate fires inside (tabs)/_layout.
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(camera)" />
        <Stack.Screen name="(reveal)" />
        <Stack.Screen
          name="paywall/index"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen name="sources" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
