# Legal Pages — Local QA before Cloudflare Deploy

**目的**: `legal/*.html` を Cloudflare Pages にデプロイする **前** に、ローカルで responsive / accessibility / link 切れを 5 分で確認。

## 1. ローカル静的サーバー起動

```powershell
cd C:/workspace/apps/mirrorbite/legal

# 方法 A: Python (推奨、ほぼ全 Windows で動く)
python -m http.server 8085

# 方法 B: Node (npx serve があれば)
npx serve . -l 8085

# 方法 C: PowerShell native (Python なしで)
# 既存 web server がない環境では方法 A を推奨
```

ブラウザで開く:
- http://localhost:8085/index.html
- http://localhost:8085/privacy.html
- http://localhost:8085/terms.html
- http://localhost:8085/support.html

## 2. QA Checklist

### 各 page で目視確認

- [ ] **index.html (Marketing)**: hero / 3 feature bullets / pricing / FAQ accordion 全部 render
- [ ] **privacy.html**: 10 section、§3 で Cloudflare / Google / Anthropic の 3rd party DPA link 全部 click 可能、§7 に "Clear all data" の在処明記
- [ ] **terms.html**: 11 section、§5 で subscription disclosure、§6 で AI limitations、§8 で liability cap、§10 で Tokyo District Court
- [ ] **support.html**: 9 FAQ で cancel / refund / accuracy / withheld / data deletion / regional pricing カバー

### Responsive (Browser DevTools で device emulate)

- [ ] iPhone 14 Pro (393×852) → text overflow なし、horizontal scroll 出ない
- [ ] iPad mini (768×1024) → OK
- [ ] Desktop (1280px) → max-width 720px で中央配置

### Accessibility

- [ ] Tab キーだけで全 link / button にフォーカス到達
- [ ] Cmd+F (find) で本文中の "Mirrorbite" を検索できる (= text として extractable)
- [ ] 画像 alt 無し (画像自体ない、HTML CSS のみ)
- [ ] Heading 階層が論理的 (h1 → h2 → h3)
- [ ] Link 色がコントラスト基準を満たす (`--teal: #3DB8A8` on white = WCAG AA)
- [ ] Voice Control / VoiceOver で読み上げて意味通る

### Link 切れチェック

```powershell
# Python script で curl 全 internal link
python -c "
import re, urllib.request
files = ['index.html', 'privacy.html', 'terms.html', 'support.html']
for f in files:
    with open(f, encoding='utf-8') as fp:
        html = fp.read()
    links = re.findall(r'href=[\"\']([^\"\\']+)[\"\\']', html)
    print(f'--- {f} ---')
    for l in links:
        if l.startswith('http'):
            try:
                req = urllib.request.Request(l, headers={'User-Agent': 'Mirrorbite-QA/1.0'})
                code = urllib.request.urlopen(req, timeout=5).status
                print(f'  {code}  {l}')
            except Exception as e:
                print(f'  ERR  {l}  {e}')
        else:
            print(f'  internal  {l}')
"
```

(Windows ターミナルで動くように quote を escape 済)

### content とコードの整合性

```powershell
# privacy.html の§3 で言ってる第三者と app の実装が一致してるか
grep -E "Cloudflare|Google Gemini|Anthropic" privacy.html
# → 3 つとも該当行が出るはず

# Privacy Policy に書いた "Clear all data" path が実装されてるか
grep -E "Clear all data" privacy.html
grep -rn "clearAllAppData" ../app ../lib
# → 両方 hit すれば一致

# metadata.json の URL と privacy.html が一致してるか
grep -E "starvingeffort\.app/mirrorbite" ../store/metadata.json
# → 4 URL (support / marketing / privacy / terms) 全部出るはず
```

## 3. Deploy 直前の最終確認

- [ ] `_headers` ファイル存在 (CSP / HSTS / X-Frame-Options)
- [ ] `_redirects` ファイル存在 (clean URL → .html)
- [ ] `wrangler.toml` で `pages_build_output_dir = "."` (project root)
- [ ] index.html の `<title>` が "Mirrorbite — Honest food reveal in 60s" のような production-ready 文言
- [ ] **どの page にも "TODO" / "FIXME" / "[example]" / "lorem ipsum" が残ってない**:

```powershell
grep -iE "TODO|FIXME|lorem|example\.com|placeholder" *.html
# → empty が期待値 (何もマッチしない)
```

## 4. Deploy へ

QA 全通過 → `legal/DEPLOY.md` の手順で wrangler pages deploy 実行。

## 参照

- Deploy 手順: `legal/DEPLOY.md`
- App Privacy 整合性: `store/metadata.json` の `app_privacy_questionnaire` セクション
