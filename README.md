# Mirrorbite

> Honest food reveal in 60 seconds. Snap a meal, get a directional read — no invented numbers.

Mirrorbite is an iOS app that gives you a categorical nutrition read on a single meal photo. No grams. No calories. No fabricated precision. When the photo is unclear, the app says so instead of guessing.

This repository is **source-available** for transparency. The code is here so anyone can see exactly what the app does with their data. See [LICENSE](./LICENSE) for usage terms.

## What it does

| Input | Output |
|---|---|
| 1 meal photo | 0–100 directional index |
| | 3 categorical axes (protein / carb balance / fiber) |
| | Identified dish + confidence level |
| | 1 strength bullet + 1 next-meal hook |
| | "I held back this one" when the model is unsure |

## How it works

```
camera/library photo
   ↓ (EXIF stripped on-device via expo-image-manipulator + expo-file-system)
data URL POST
   ↓ x-mb-client-secret
Cloudflare Worker (mirrorbite-vision-proxy)
   ↓
Stage 1: Gemini 2.5 Flash → structured JSON
   ↓ if confidence=low + non-best-guess dish
Stage 2: Claude Sonnet 4 (escalation, ~10% of calls)
   ↓
schema + semantic validation
   ↓ (both fail → graceful 200 withheld photo_unclear)
client renders reveal screen
```

The Worker source lives separately at `mirrorbite-worker/` (not in this repo).

## Privacy promises (enforced by code, not just policy)

- Photos are encrypted in transit (HTTPS), analyzed once by our server, then deleted.
- We never store images on our side.
- We never use uploaded images to train models.
- The Worker proxy forwards a single-shot request; on-device manipulation strips EXIF/GPS/orientation/camera-model before any network call.

Privacy Policy: <https://mirrorbite.starving-effort.com/privacy>

## Tech stack

- **React Native + Expo SDK 54** (managed workflow)
- **TypeScript strict mode**
- **Expo Router 6** (file-based routing + 5-tab nav: Home / Camera / Library / Trends / Settings)
- **RevenueCat** (subscription gate, paywall, restore)
- **Cloudflare Workers** (vision proxy + edge auth)
- **EAS Build** (iOS production builds — local mode via GitHub Actions)

## Build locally

You need Apple Developer credentials to build for iOS. The repo does **not** include `.secrets/`, `credentials.json`, or `.env.local` — those are personal credentials that should never be committed.

```bash
npm install
npx expo start                 # dev server (no native build needed)
npx expo start --web           # web preview at localhost:8081
```

For native iOS builds you need to:
1. Configure Apple Developer credentials (provisioning profile + distribution cert)
2. Set `EXPO_PUBLIC_VISION_API_URL`, `EXPO_PUBLIC_RC_API_KEY_IOS`, `EXPO_PUBLIC_MB_CLIENT_SECRET` in `.env.local`
3. `npx eas-cli build --platform ios --profile production --local`

CI builds run on GitHub Actions `macos-latest` runners (see `.github/workflows/ios-build.yml`).

## Status

| Surface | Status |
|---|---|
| iOS App Store | Pre-launch (Day 12 target: 2026-05-30) |
| TestFlight | Internal testing |
| Web preview | Local dev only |
| Android | Not currently shipped |

## Contributing

Issues for **bug reports about the live App Store version** are welcome. Feature PRs are not currently merged — this is a small focused product. Forks for personal learning are encouraged; commercial forks are not licensed (see LICENSE).

## Contact

- Support: `hello@starving-effort.com`
- Marketing site: <https://mirrorbite.starving-effort.com>
