import { Stack } from 'expo-router';

// v1.1 — index moved to (tabs)/index.tsx. Only processing remains here so it
// presents OVER the tab bar (modal-like) during analysis.
export default function CameraLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="processing" />
    </Stack>
  );
}
