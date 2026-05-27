---
name: pre-submission-check
description: iOS app の App Store submit 前 pre-flight check 自動化。app.json / Info.plist / metadata + Apple Review Guidelines (50+ static rule) + Claude API のセマンティック判定で reject パターンを事前検出する内製 tool。Mirrorbite / Tend Pets / 今後の Line I app 全部で使う。AppReview-AI の内製版 (商品化せず、内部 audit 用)。
trigger:
  - submit 前 check
  - pre-submission
  - App Store reject
  - ship-ready audit 補完
  - apple guideline 確認
  - Mirrorbite submit
  - Tend Pets submit
status: active
created: 2026-05-27
provenance: AppReview-AI (https://appreview-ai.jp) の機能を内製化、ship-ready-audit Round F の自動化補助
---

# Pre-Submission Check — iOS App Store Reject パターン事前検出

## いつ使うか

iOS app を App Store Connect に submit する前に **必ず 1 回 run**。

- Mirrorbite submit 直前 (5/30 等)
- Tend Pets submit 直前
- 今後の Line I app 全部
- 大きな metadata 変更後 (description 書き直し / category 変更等)

`ship-ready-audit` skill (manual Round F walkthrough) の **補助・補完**。重複ではない。
- ship-ready-audit = 人間 (or AI) が manual walkthrough、UX / 動作 / 体感を確認
- pre-submission-check = 静的 + LLM で **書類整合性 / Apple guideline 違反パターン** を機械的に検出

## 使い方

### 基本

```bash
cd C:/workspace
python .claude/skills/pre-submission-check/check.py apps/mirrorbite
```

→ `generated/research/ship-check-reports/{YYYY-MM-DD}-{app-name}.md` に出力。

### Mirrorbite で実例

```bash
python .claude/skills/pre-submission-check/check.py apps/mirrorbite \
  --output generated/research/ship-check-reports/mirrorbite-build38.md
```

### Claude API 使う / 使わない

- default: 使う (より精度高い、~10 円/scan)
- skip したい場合: `--no-llm`

```bash
python .claude/skills/pre-submission-check/check.py apps/mirrorbite --no-llm
```

## 検出する category (現在 50+ rule、追加可能)

| Category | 例 |
|---|---|
| Privacy & Manifest | NSPrivacyAccessedAPITypes 完全性 / .xcprivacy 必須 key |
| Permission descriptions | NSCameraUsageDescription 等が「アプリのために使用」等の曖昧表現でないか |
| Account deletion | login 機能あれば設定内に削除 path 必須 |
| ATT framework | tracking 使うなら NSUserTrackingUsageDescription |
| AI 生成コンテンツ | AI 使用なら label + filtering |
| UGC moderation | ユーザー投稿あればブロック / 通報 UI |
| Subscription disclosure | 価格 / 自動更新 / キャンセル方法明示 |
| IAP 外部決済 | 3.1.1 違反 (外部 link 禁止) |
| Health app | 1.4.1 safety-critical (false claim 禁止) |
| Competitor disparagement | 4.0 (Cal AI 等他社名 言及 禁止) |
| Metadata accuracy | 2.3.x (description ↔ 実装整合) |
| Keywords | 商標違反 / 100 char 超過 |
| Bundle ID 形式 | 逆 DNS / Apple 推奨 pattern |

## 出力 format (markdown report)

```
# Pre-Submission Check: Mirrorbite (2026-05-27)

## Summary
- ❌ CRITICAL: 2
- ⚠️  WARNING: 5
- ✅ PASS: 43

## CRITICAL (must fix before submit)

### ❌ 1. Privacy Manifest 不完全
Guideline: 5.1.2 Privacy - Data Use and Sharing
Detected in: app.json / privacyManifests
Issue: ...
Fix: ...

### ❌ 2. ...

## WARNING (recommend to fix)

### ⚠️ 1. ...

## PASS

(略)
```

## 実装の中身

- `check.py` — Python CLI、Anthropic SDK 使用
- `rules.json` — Apple Guidelines 静的 rule (50+, 拡張可能)
- `templates/report.md` — output template
- `templates/llm-system-prompt.md` — Claude judgement 用 system prompt

## 依存

- Python 3.10+
- `anthropic` パッケージ (`pip install anthropic`)
- 環境変数 `ANTHROPIC_API_KEY` (workspace 既存利用)

## 出処

- AppReview AI (https://appreview-ai.jp) を内製化
- ship-ready-audit skill と相補的
- 商品化しない (内部 audit のみ)
- 参考: `generated/research/appreview-ai-scan/clone-spec.md`
