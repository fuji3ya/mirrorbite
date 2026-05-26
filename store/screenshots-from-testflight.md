# Mirrorbite — App Store Screenshots from TestFlight (推奨ルート)

**結論**: ChatGPT 生成 mockup より **TestFlight に install した実機 iPhone から screenshot 取る方が良い**。

## なぜ実機 screenshot 推奨か

| 観点 | ChatGPT (gpt-image-2) | TestFlight 実機 |
|---|---|---|
| **真正性** | AI mock、Reviewer に「fabricated」と疑われ得る | 実機 native UI、Apple Reviewer に異論なし |
| **画質** | 1024×1792 → PIL resize、輪郭にじむ | 1290×2796 native、pixel-perfect |
| **作業時間** | 5 枚 × 5-10 min = 25-50 min | iPhone で 5 分 (各画面で screenshot 押すだけ) |
| **Apple Guideline 2.3.10 (Accurate Metadata)** | 「実装と異なる UI を出すと reject」リスク | 実装そのものなので 100% 一致 |
| **iOS native の polish** | Status bar / Dynamic Island / inset 等 AI が間違える | 実機が正しく描画 |

## 推奨フロー (Day 7 朝、TestFlight build 完了後)

### Step 1: TestFlight build を iPhone install

`RUNBOOK-DAY-6-7.md` の Step 5「Preview build をテスト」で生成済の build が、 TestFlight Internal Testers (自分の Apple ID) として install できる。

```
Apple ID メールに TestFlight 招待 → iPhone の TestFlight アプリ → install
```

### Step 2: 6 画面をそれぞれ screenshot (実機操作 ~5 min)

iPhone で Mirrorbite を起動 → 以下 6 画面を **音量上ボタン + サイドボタン同時押し** (iPhone 8+ / X 以降) で screenshot:

| # | 画面 | 操作 |
|---|---|---|
| 1 | **Frame 0 (Privacy)** | 起動 → onboarding 1 画面目 |
| 2 | **Sample Reveal** (delivered) | onboarding 通過 → a3-reveal で表示される sample |
| 3 | **Paywall** | a3-reveal → "Got it" → paywall |
| 4 | **Camera home** | paywall close X → camera viewfinder + history |
| 5 | **Reveal-delivered** | (camera から shutter で実 reveal、または history 1 件目 tap) |
| 6 | **Reveal-withheld** | history thumb 2 件目 tap (withheld sample) |

各 screenshot は iPhone の Photos アプリに保存される。

### Step 3: Mac/Windows に転送

- AirDrop (Mac) → Mac の Photos アプリ → Export Original
- iCloud Photos sync (Windows) → iCloud Photos client から .png 取り出し
- USB ケーブル → File Explorer → DCIM/100APPLE

### Step 4: App Store Connect upload

ASC → Mirrorbite → 1.0.0 → Screenshots → 6.7" Display → drag & drop 6 枚

サイズ自動チェック (1290×2796 required for iPhone 16 Pro Max screenshot)。

## 6.5" Display screenshots (任意)

iPhone 14 Plus / 15 Plus 持ってる人だけ撮れば良い。**Phase 0 では 6.7" のみで OK**、Apple Reviewer は 6.5" がなくても通す (2024+ の新しい guideline)。

## それでも今すぐ AI mockup を出したい場合

`store/app-store-screenshot-prompts.md` の 5 prompt (#1-5) を順次 ChatGPT (gpt-image-2) に投下:

```
Prompt:
- Hero (reveal score 72/100)
- Promise frame (Privacy 3 promises)
- Withheld magic (I held back this one)
- Onboarding flow (3-up montage)
- Pricing (paywall, $6.99/$39.99 SAVE 89%)
```

各 prompt は **portrait 9:16 aspect** を指定、生成後 PIL で 1290×2796 に resize:

```powershell
python -c "from PIL import Image; im=Image.open(r'C:/Users/fujim/Downloads/<file>').convert('RGB'); im=im.resize((1290,2796), Image.LANCZOS); im.save(r'C:/workspace/apps/mirrorbite/store/screenshots/01-hero.png', 'PNG', optimize=True)"
```

**ただし TestFlight 実機ルートが圧倒的に楽 + 高品質なので、特別な事情ない限りこれは skip 推奨**。

## Phase 1 (post-launch、Day 8-11 beta 後) で 6 枚目追加

- Beta tester 5 名から quote 取得 (DM / email)
- Figma / Sketch で 3-up testimonial card を作成
- Mirrorbite UI screenshot と重ねて 6 枚目を生成
- ASC で Phase 1 update として upload

## 参照

- 元 prompts: `generated/research/mirrorbite/day2-buildup/app-store-screenshot-prompts.md`
- TestFlight build 手順: `RUNBOOK-DAY-6-7.md` §Day 6 午後 + §Day 7 朝
- ASC upload: `store/app-store-connect-form-fillins.md` §Screenshots
