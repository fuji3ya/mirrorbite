/**
 * Mirrorbite v1.1 — Bottom tab navigator + onboarding gate.
 *
 * Tabs (5):
 *   index    — Home (brand + status + Snap CTA + recent strip)
 *   camera   — Camera viewfinder + shutter + library picker + thumbs
 *   library  — Full history list (all past reveals)
 *   trends   — Categorical breakdown (axis frequency, 7-day index avg)
 *   settings — Manage subscription, About links, Clear data
 *
 * processing screen lives under (camera)/ so it presents modally on top of
 * the tab bar (tab bar hides during analysis — feels less interruptive).
 *
 * Gate: checks isPrivacySeen() on mount; if false (first run) → redirect to
 * onboarding. This used to live in a separate app/index.tsx but that file
 * conflicted with (tabs)/index for URL "/" and prevented Home from rendering.
 * Co-locating the gate here keeps a single route at "/" and unambiguous.
 */

import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { isPrivacySeen } from '@/lib/onboarding-state';
import { colors } from '@/lib/theme';

const REVIEW_MODE = process.env.EXPO_PUBLIC_REVIEW_MODE === '1';

export default function TabLayout() {
  // null = still checking, true = onboarded, false = needs onboarding
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    if (REVIEW_MODE) {
      setSeen(true);
      return;
    }
    isPrivacySeen().then(setSeen);
  }, []);

  if (seen === null) return null; // splash via expo-splash-screen
  if (!seen) return <Redirect href="/(onboarding)/privacy" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal700,
        tabBarInactiveTintColor: colors.ink400,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.ink100,
          // iOS HIG: 49pt min height for the tab bar; native default is fine.
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color, size }) => <Feather name="camera" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
