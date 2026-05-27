import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 220,
      }}
    >
      <Stack.Screen name="privacy" />
      <Stack.Screen name="a1-goal" />
      <Stack.Screen name="a1-eatout" />
      <Stack.Screen name="a2-mystery" />
      <Stack.Screen name="a3-reveal" />
    </Stack>
  );
}
