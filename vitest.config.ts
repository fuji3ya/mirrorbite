import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  define: {
    // Match Expo / React Native's __DEV__ flag at test time. We treat tests as DEV builds
    // so mock-path tests stay green; production-fail tests opt out per-case.
    __DEV__: 'true',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Avoid pulling RN runtime — lib tests are pure TS only
    server: { deps: { inline: [] } },
  },
});
