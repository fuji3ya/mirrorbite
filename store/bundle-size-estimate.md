# Mirrorbite — Bundle Size Estimate

**目的**: IPA size を事前推定して Apple cellular download limit (200 MB) + App Store Connect upload limit (4 GB) との安全マージンを確認。

**測定日**: 2026-05-19

## 測定方法

```bash
du -sh assets app components lib   # source
du -sh node_modules/<key-deps>     # SDK heavy hitters
```

## 結果

### Source

| Folder | Size |
|---|---:|
| `assets/` (icon, splash, favicon, android-icon) | 524 KB |
| `app/` (16 screens) | 119 KB |
| `components/` (3 components) | 47 KB |
| `lib/` (12 utils) | 40 KB |
| `legal/` (4 HTML — not bundled) | — |
| **合計 source** | **730 KB** |

### Key node_modules (iOS framework になる範囲)

| Package | Size | 必須 |
|---|---:|---|
| `expo-camera` | 13 MB | ✅ shutter button core |
| `expo-image-picker` | 735 KB | ✅ library fallback |
| `expo-image-manipulator` | 12 MB | ✅ EXIF strip (privacy claim) |
| `react-native-purchases` | 426 KB | ✅ subscription |
| `expo-router` | (含 expo) | ✅ navigation |
| `expo-image` | (含 expo) | ✅ photo display |
| `react-native` (core) | (測定済 separate) | ✅ |

Heavy 3 packages 合計: **約 26 MB** (raw npm)。これらは iOS native framework に compile されると **大幅縮小** (重複 binary 除去 + Bitcode strip + 不要 source 除去)。

## IPA size 推定

Expo SDK 54 + Hermes engine + production build (release configuration):

| Component | 推定 size |
|---|---:|
| Hermes runtime + RN core | ~25 MB |
| Expo modules (camera + image-picker + image-manipulator + image + router) | ~15 MB |
| React Native Purchases (RC SDK) | ~3 MB |
| App source (bundled JS) | ~2 MB |
| Assets (icon + splash + android-icon) | ~0.5 MB |
| Other (Info.plist, frameworks, signing) | ~3 MB |
| **iOS IPA (推定)** | **~48 MB** |

Apple は IPA を device 別に thin (分割) するので、最終 download size は:
- iPhone (arm64): ~35-50 MB
- iPad: 該当外 (supportsTablet: false)

## Apple limit との比較

| Limit | 値 | 我々の値 | 余裕 |
|---|---:|---:|---|
| Cellular download (5G/LTE) | 200 MB | ~50 MB | ✅ 75% 余裕 |
| Cellular download (legacy threshold) | 150 MB | ~50 MB | ✅ 66% 余裕 |
| App Store Connect upload | 4 GB | ~50 MB | ✅ 圧倒的余裕 |
| App Thinning per-device | 2 GB | ~50 MB | ✅ |

**結論: cellular download 範囲内、user は Wi-Fi 不要で install 可能** ✅

## Phase 1 で size が膨らむ要素

| 追加機能 | 推定追加 size |
|---|---:|
| Localization (JP/KR/TW string resources) | +1 MB |
| Dark mode tokens + assets | +0.5 MB |
| Push notification (FCM/APNs) | +2 MB |
| iPad layout assets | +1-2 MB |
| Widget extension | +3 MB |
| **Phase 1 推定 IPA** | **~55-60 MB** |

Cellular limit 200 MB に対してまだ余裕。

## 削減できる余地 (将来オプション)

- `expo-image-manipulator` (12 MB) — JPEG 再エンコードだけなら一部置換可能だが、現状の EXIF strip 用途では必須
- `expo-image` (含 expo) — `react-native` の組み込み `Image` で代替可能だが、cache + placeholder の質が落ちる
- Hermes → JSC swap — 推奨しない (パフォーマンス劣化)

## 計測コマンド (Day 7 build 後の実測用)

```bash
# IPA を解凍して中身を見る
cd C:/workspace/apps/mirrorbite
# eas build 完了後、build artifact URL からダウンロード
mkdir -p tmp/ipa-inspect
cd tmp/ipa-inspect
unzip ../../build-XXXX.ipa  # → Payload/Mirrorbite.app/
du -sh Payload/Mirrorbite.app/*
du -sh Payload/Mirrorbite.app/Frameworks/*
du -sh Payload/Mirrorbite.app/Mirrorbite       # main binary
du -sh Payload/Mirrorbite.app/main.jsbundle    # JS bundle
du -sh Payload/Mirrorbite.app/assets           # bundled assets
```

実際の値が **推定の ±20% 以内** なら問題なし。70 MB 超えるなら image-manipulator / camera の subset を再評価。

## 参照

- Apple cellular limit: https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes
- Expo bundle size best practices: https://docs.expo.dev/guides/analyzing-bundles/
- Runbook: `RUNBOOK-DAY-6-7.md`
