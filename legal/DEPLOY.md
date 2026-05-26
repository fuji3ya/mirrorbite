# Mirrorbite Legal Site — Cloudflare Pages Deploy

**目的**: `mirrorbite.starving-effort.com/{,privacy,terms,support}` を Apple App Review 提出までに公開する。

**所要時間**: 約 10 分 (user 操作)。

## 0. 前提

- Cloudflare アカウント (既存 `starving-effort.com` zone 想定)
- `npx wrangler` 利用可能 (Node 20+)

## 1. Wrangler ログイン (初回のみ)

```bash
cd C:/workspace/apps/mirrorbite/legal
npx wrangler login
# → ブラウザで Cloudflare 認証
```

## 2. Pages プロジェクト作成 + 初回 deploy

```bash
cd C:/workspace/apps/mirrorbite/legal
npx wrangler pages deploy . \
  --project-name=mirrorbite-legal \
  --branch=main \
  --commit-dirty=true
```

成功するとプロジェクト URL が表示される。例:
```
https://mirrorbite-legal.pages.dev/
```

この時点で動作確認:
- `https://mirrorbite-legal.pages.dev/privacy.html`
- `https://mirrorbite-legal.pages.dev/terms.html`
- `https://mirrorbite-legal.pages.dev/support.html`
- `https://mirrorbite-legal.pages.dev/index.html`

## 3. カスタムドメイン (`mirrorbite.starving-effort.com/*`) 設定

Cloudflare dashboard → Pages → `mirrorbite-legal` → Custom domains:

1. **Add Custom Domain** → `starving-effort.com`
2. Cloudflare が DNS / SSL を自動設定 (`starving-effort.com` は既に Cloudflare zone のはず)
3. Pages 側で path mapping: `/mirrorbite/*` をこのプロジェクト root に向ける

最終 URL (これらは `store/metadata.json` の `support_url` / `privacy_policy_url` / `terms_of_service_url` / `marketing_url` で参照済):

| URL | 内容 |
|---|---|
| `https://mirrorbite.starving-effort.com/` | Marketing landing (index.html) |
| `https://mirrorbite.starving-effort.com/privacy` | Privacy Policy |
| `https://mirrorbite.starving-effort.com/terms` | Terms of Service |
| `https://mirrorbite.starving-effort.com/support` | Support / FAQ |

## 4. デプロイ検証チェックリスト

- [ ] `curl -I https://mirrorbite.starving-effort.com/privacy` で 200 / Content-Type: text/html
- [ ] `curl -sS https://mirrorbite.starving-effort.com/privacy | grep -i "Last updated"` で本文取得確認
- [ ] Safari / Chrome で 4 page 開き、レスポンシブ / link が動く
- [ ] `_headers` の CSP / HSTS が response header に乗ってる
- [ ] `_redirects` で `/mirrorbite/privacy` が `/mirrorbite/privacy.html` に内部 200 (cloak)
- [ ] App Privacy Manifest の disclosure と Privacy Policy §3 が一致してる目視確認
- [ ] iOS Safari + accessibility (Voice Control) で読める

## 5. 以後の更新 deploy

```bash
cd C:/workspace/apps/mirrorbite/legal
# privacy.html などを編集後:
npx wrangler pages deploy . \
  --project-name=mirrorbite-legal \
  --branch=main \
  --commit-dirty=true
```

数十秒で世界中に伝播。

## 6. Rollback

事故った場合は Cloudflare dashboard → Pages → Deployments → 1 つ前を **Promote to production**。手動 30 秒。

## 7. SHIP-CHECKLIST.md との連携

このページ deploy が完了したら `SHIP-CHECKLIST.md` の以下 step を tick:

- [x] Legal hosting (Cloudflare Pages) — 4 page 動作確認済
- [x] `store/metadata.json` の URL 4 本が actual 200 を返す
