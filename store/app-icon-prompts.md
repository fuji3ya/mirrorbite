# Mirrorbite App Icon — ChatGPT (gpt-image-2) prompts

**最終 icon は ChatGPT Plus / Pro の gpt-image-2 で生成して `assets/images/icon.png` に上書きする** のが本筋。

現状 `assets/images/icon.png` は PIL で生成済の暫定 (plate + bite wedge design)。**Apple Review は通る品質** だが Apple Design Awards 級ではない。Day 12 ship までに gpt-image-2 polished 版に差し替えるのが推奨。

---

## 規格 (Apple HIG + Google Play 準拠)

| 用途 | サイズ | format | 注意 |
|---|---|---|---|
| **App Store / iOS app icon** | **1024 × 1024** | **PNG, no alpha** | 角丸は Apple が自動付加、四角で出力。alpha は flatten される |
| Android adaptive icon foreground | 432 × 432 + 中央 60% safe zone | PNG with alpha | foreground 中央 60% に主要要素 |
| Splash screen icon | 800 × 800 (中央配置) | PNG with alpha | 同じデザインの縮小 |

⚠️ gpt-image-2 は 1024×1024 で出力できるが、PNG alpha を残すことがある。**生成後に必ず alpha を flatten** してから `icon.png` に上書きする (本書末尾の差し替え手順参照)。

---

## ブランド方向性 (6 周 audit + PIL v2 trial で得た学び)

### ✅ 効くもの

- **Mirror metaphor (反射 / 対称 / 円)** = 「正直さ」「鏡映」の隠喩
- **Bite metaphor (噛み跡 / wedge / crescent)** = 食事 + アプリ名直結
- **Plate-from-above (円形)** = 食事感を抽象的に表現
- **Gradient teal background** (#6FD0C2 → #2A9A8A) = brand color + Health 系の安心感
- **Single glyph, lots of negative space** = Apple Design Awards / iOS 18 native style
- **Asymmetric composition** (bite が右上に偏る等) = retina に残る

### ❌ 失敗 / 避ける

- 文字 (M, MB, Mirrorbite) → App Store で名前と二重表記、reject の遠因
- 食器スプーン / フォーク → ありきたり、Cal AI / Lifesum と被る
- AI / robot 表現 → Apple は AI 製品の literal robot 嫌う
- 顔 / 表情 → Mirrorbite は人ではなく「食事」がテーマ
- 写実的な料理写真 → Apple Design Awards 風から外れる
- **対称 crescent ペア** → 髭 / 鳥の翼 / 笑顔に誤読される (PIL v1 で実証済)
- 内側に小さな detail を詰める → サムネイル (60×60) で読めない
- 透明背景 → Apple は flatten、結果が不安定
- 角丸を icon 内に描く → Apple 自動付加と二重で reject

### 競合との差別化メモ

| App | 既存 icon | 我々の差別化 |
|---|---|---|
| Cal AI | 緑背景 + 白いリンゴ | リンゴ排除、bite 隠喩で食事を抽象化 |
| Yuka | 白背景 + 緑リンゴ | teal gradient で warm health 感 |
| MyFitnessPal | 青背景 + brand mark | brand mark なし、glyph-first |
| Lifesum | 紫グラデ + 白いハート | ハート系排除、bite + plate で食事直結 |
| Apple Health | 白背景 + ハートピンク | teal gradient で別カテゴリ感 |

---

## Prompt A (主案 — Plate with a single bite wedge missing)

PIL v2 で実証済のコンポジション。**最も Mirrorbite らしい**。

```
A photorealistic iOS app icon for "Mirrorbite", 1024 × 1024 PNG, square (no rounded corners — Apple will add them automatically).

Background: a smooth vertical gradient from gentle teal #6FD0C2 at the top to deeper teal #2A9A8A at the bottom. No texture, no noise, perfectly clean.

Foreground: a single solid white circle, centered horizontally and vertically, occupying about 62% of the canvas diameter. The circle is the "plate" — a clean disc viewed from directly above.

From the upper-right of the plate, a "bite" has been taken: a smaller perfect circle (about 36% of the plate's diameter) is subtracted from the plate, positioned so its center sits just outside the plate's upper-right edge. The result is a clean crescent moon shape that reads as both "a mirror with a piece reflected away" and "a plate someone just took a bite from".

The bite wedge reveals the teal gradient background through it — no internal coloring, pure negative space.

Lighting: very subtle soft inner shadow on the lower-right edge of the plate, suggesting depth without being literal. A barely-visible drop shadow under the plate (5% opacity, soft, ~12px blur) to lift it from the background.

Style: Apple Design Awards 2025 quality, iOS 18 native look. Minimalist, geometric, glyph-first. Editorial design sensibility. NOT illustrated, NOT 3D, NOT photographic, NOT cute, NOT cartoon.

Strictly NO TEXT, NO LETTERS, NO BRAND NAME, NO numbers anywhere on the icon. NO utensils, NO faces, NO emoji, NO photographic food, NO patterns, NO sparkles, NO highlights flares.

Output: exactly 1024 × 1024 pixels, full edge-to-edge, no padding, no alpha transparency in the rendered file, square aspect ratio with sharp 90° corners.
```

---

## Prompt B (代案 — Reflection symmetry / interlocking arcs)

「mirror」を視覚化する方向。yin-yang から literal-ness を引いた抽象。

```
A photorealistic iOS app icon for "Mirrorbite", 1024 × 1024 PNG, square, no rounded corners.

Background: smooth vertical gradient from #6FD0C2 (top) to #2A9A8A (bottom), perfectly clean.

Foreground: two interlocking arc shapes that together form a single perfect circle (the "plate"), centered, occupying about 60% of the canvas. The upper-left arc is solid white. The lower-right arc is empty (gradient background showing through, no fill, no outline). The two arcs meet along a soft S-curve that reads as a horizontal mirror plane.

The composition reads simultaneously as:
- A circle half-eaten (a bite consumed the lower-right)
- A reflection: white above, mirror-empty below
- A bowl tilted toward the viewer

Lighting: subtle soft glow on the white arc's outer edge, no harsh highlights. Soft drop shadow under the entire composite (5% opacity, ~12px blur).

Style: Apple Design Awards quality, iOS 18 native, minimalist, glyph-first, geometric. NOT illustrated, NOT 3D, NOT cartoon.

Strictly NO TEXT, NO LETTERS, NO numbers, NO utensils, NO faces, NO emoji, NO food imagery, NO patterns.

Output: exactly 1024 × 1024px, edge-to-edge, no padding, no alpha, square with sharp 90° corners.
```

---

## Prompt C (代案 — Activity-ring style minimal)

Apple Health / Fitness カテゴリの familiar 系。最も risk が低い、最もシンプル。

```
A photorealistic iOS app icon for "Mirrorbite", 1024 × 1024 PNG, square, no rounded corners.

Background: solid #3DB8A8 (Mirrorbite teal), perfectly flat, no gradient, no texture.

Foreground: a single thin white ring (proportionally narrow — stroke about 8 px at 1024 resolution), centered, occupying about 54% of the canvas diameter. The ring is hollow (no fill).

Above the ring's top-right curve, sitting just on the ring's path, a single small solid white dot (about 8% of the ring's diameter). The dot reads as "the bite" — a single moment marked on the cycle of meals.

Lighting: completely flat. No drop shadow, no glow, no gradient on any element. Maximum simplicity.

Style: Apple Health / Apple Fitness / Apple Activity rings inspired. Minimalist, glyph-first, geometric. Editorial.

Strictly NO TEXT, NO LETTERS, NO numbers, NO utensils, NO faces, NO emoji, NO food imagery, NO multiple shapes inside the ring.

Output: 1024 × 1024px, edge-to-edge, no padding, no alpha, square with sharp 90° corners.
```

---

## Prompt D (代案 — Half-eaten apple silhouette, abstracted)

Cal AI の「リンゴ」直接被りを避けつつ、最も recognizable な food metaphor。

```
A photorealistic iOS app icon, 1024 × 1024 PNG, square, no rounded corners.

Background: smooth vertical gradient from #6FD0C2 (top) to #2A9A8A (bottom).

Foreground: a single abstracted "bitten apple" silhouette, but heavily geometric — almost reducible to a circle with a curved bite taken from the right side and a tiny leaf-stem accent at the top-left. The whole shape is pure white. The leaf-stem is the same teal as the deeper background color (#2A9A8A), barely visible, just enough to add a touch of organic-ness.

The bitten edge curve must be a smooth, single arc — not jagged, not textured. The bite is a clean wedge missing.

Style: Apple Design Awards quality, iOS 18 native. Geometric, not illustrated, not 3D, not photographic. Editorial sensibility.

Strictly NO TEXT, NO LETTERS, NO numbers, NO faces, NO emoji, NO sparkles, NO multiple apples.

⚠️ Critical: must NOT resemble the Apple Inc. corporate logo. The bite should be on the RIGHT side (Apple logo bite is also right but our overall shape needs softer roundness and more abstracted simplicity).

Output: exactly 1024 × 1024px, edge-to-edge, no padding, no alpha, square with sharp 90° corners.
```

---

## ChatGPT に投げる手順 (Day 7 朝、約 15 分)

1. **ChatGPT を開く** (Plus / Pro / Enterprise が必要、gpt-image-2 へのアクセス権)
2. 新規 chat で **モデルを GPT-4o に設定**
3. **Prompt A を全文コピペ** して送信
4. 30-60 秒待つと 1024×1024 PNG が生成される
5. **画像を右クリック → 「画像を保存」**
6. ダウンロードした PNG を目視確認:
   - サイズ: 1024 × 1024
   - background: teal gradient で埋まってる (透明じゃない)
   - 角丸: 入ってない (square)
   - text: 一切なし
   - glyph: 単一、negative space で構成
7. OK なら次の手順 (差し替え) へ。違和感あれば **Prompt B / C / D を順に試す**

### 反復回数の目安

- 1-2 回目で「これでいい」と思える image が出る確率: 50%
- 3-5 回目: 80%
- それ以上回しても改善しないなら **PIL 暫定版で submit する** ことに切り替え (ship 速度優先)

### プロンプト微調整 Tips

gpt-image-2 が言うこと聞かない時:

- **「no rounded corners」が無視される** → 「square aspect ratio with sharp 90° corners, edge-to-edge, no rounded corners — Apple will add them automatically」を 2 箇所に分散して書く
- **alpha が入る** → 「fully opaque, no transparency, the background must be fully filled with the gradient」を明示
- **literal なリンゴが出る** → Prompt A / B / C を使う (D は最後の手段)
- **glyph に詳細が増えすぎる** → 「extreme minimalism, single glyph only, vast negative space, like an Apple Activity ring」を追加
- **gradient が banding する** → 「smooth gradient without banding, dithered if necessary」

---

## 差し替え手順 (gpt-image-2 出力後)

```powershell
# ダウンロードした PNG (例: ~/Downloads/icon-from-chatgpt.png) を flatten + 上書き
cd C:/workspace/apps/mirrorbite

# 1. alpha flatten + 1024×1024 確認 + 上書き (1 行 Python)
python -c "from PIL import Image; im=Image.open(r'C:/Users/fujim/Downloads/icon-from-chatgpt.png').convert('RGBA'); assert im.size==(1024,1024), f'wrong size: {im.size}'; bg=Image.new('RGB',im.size,(0xFF,0xFF,0xFF)); bg.paste(im, mask=im.split()[-1]); bg.save(r'assets/images/icon.png','PNG',optimize=True); print('saved 1024x1024 no-alpha')"

# 2. 上書き確認
ls -la assets/images/icon.png

# 3. (任意) Splash / Android adaptive も同じデザインで生成したい場合
#    a. 同 prompt の最初の "1024 × 1024" を "800 × 800" に書き換えて再生成 → splash-icon.png に保存
#    b. android-icon-foreground.png は 432×432 で「中央 60% に icon の主要要素」を再 prompt
#    c. 急ぐなら PIL の generate-interim-icon.py の versions をそのまま使う
```

差し替え後の build:

```powershell
npx expo prebuild --clean --platform ios
npx eas build --profile production --platform ios --non-interactive
# → 25-40 min cloud build → TestFlight にアップロード
```

---

## 検証 checklist (差し替え後、submit 前に必ず)

- [ ] `identify -format "%w %h %[colorspace] %[channels]" icon.png` → `1024 1024 sRGB rgb` (alpha 無し!) ※ ImageMagick or Pillow
- [ ] App Store サムネサイズ (60×60 縮小) で **glyph が読める**:
  ```powershell
  python -c "from PIL import Image; Image.open('assets/images/icon.png').resize((60,60)).save('tmp/icon-thumb.png'); print('open tmp/icon-thumb.png')"
  ```
- [ ] White background, dark text の Reviewer 端末で **存在感が出る** (= teal background が薄すぎない)
- [ ] Cal AI / Yuka / Lifesum と App Store カテゴリ一覧で並べたとき **識別できる**
- [ ] Apple HIG の "App icon" ガイドライン (https://developer.apple.com/design/human-interface-guidelines/app-icons) を 1 つずつ照らして違反なし
- [ ] file size 1 MB 未満 (Apple 推奨)

---

## ❌ Apple Review reject パターン (絶対回避)

| 違反 | 結果 |
|---|---|
| 角丸を icon 内に描く | Apple 自動付加と二重で reject |
| 透明 background (alpha 残し) | Apple は flatten、結果が不安定で reject |
| 文字 (M / MB / Mirrorbite) を入れる | App Store の Subtitle と被って汚い → 遠因 reject |
| 医療系記号 (十字 / 薬カプセル / 血圧計) | "Health & Fitness" カテゴリで誤分類、Apple Reviewer が medical app 扱いし 1.4.1 で reject |
| Apple ロゴそっくりの bitten apple | 商標近似で 5.2 IP reject 確定 (Prompt D で「must NOT resemble Apple Inc. corporate logo」明示済) |
| App Store 提出用と TestFlight 用で異なる icon | バージョン不整合で reject |
| Expo template default をそのまま残す | "default template" 判定で 2.1 App Completeness reject 確定 |

---

## PIL 暫定版との比較

| 観点 | PIL v2 (現状) | gpt-image-2 (推奨) |
|---|---|---|
| デザイン品質 | Apple Review pass | Apple Design Awards 級 |
| ブランド ID 強度 | 中 (plate + bite が伝わる) | 高 (細部の polish + 光の表現) |
| 制作時間 | 0 (生成済) | 15-30 min (反復含む) |
| 再現性 | 100% (script で再生成) | 低 (同 prompt でも揺らぎ) |
| Day 12 ship | OK (そのまま使える) | 推奨 (差し替えると better) |
| Phase 1 改善 | gpt-image-2 で diff 取りやすい | 専門デザイナーで再 polish 候補 |

**Day 12 ship までに gpt-image-2 で polished に差し替えるのが理想**。間に合わなければ PIL v2 で submit、Phase 1 (post-launch) で差し替えで OK。

---

## 参照

- 暫定 icon 生成 script: `store/generate-interim-icon.py`
- 暫定 icon (現状の `icon.png`): PIL v2 — Day 7 朝に gpt-image-2 で上書き想定
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/app-icons
- ChatGPT 画像生成 docs: https://help.openai.com/en/articles/8400625
- 差し替え後の build 手順: `RUNBOOK-DAY-6-7.md` §Day 7 朝
- submit form: `store/app-store-connect-form-fillins.md`
