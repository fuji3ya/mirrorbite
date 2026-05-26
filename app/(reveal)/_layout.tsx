import { Stack } from 'expo-router';

export default function RevealLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="delivered" />
      <Stack.Screen name="withheld" />
    </Stack>
  );
}
