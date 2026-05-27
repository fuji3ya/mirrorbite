#!/usr/bin/env python3
"""
Pre-Submission Check — iOS App Store reject パターン事前検出 (内製版 AppReview-AI)

Usage:
  python check.py <app_dir> [--output PATH] [--no-llm]

Example:
  python check.py apps/mirrorbite
  python check.py apps/mirrorbite --output generated/research/ship-check-reports/mirrorbite.md
  python check.py apps/mirrorbite --no-llm
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parent.parent.parent  # .claude/skills/pre-submission-check -> workspace
RULES_PATH = SCRIPT_DIR / "rules.json"


def load_rules():
    with open(RULES_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_app_json(app_dir: Path):
    p = app_dir / "app.json"
    if not p.exists():
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load_metadata_json(app_dir: Path):
    p = app_dir / "store" / "metadata.json"
    if not p.exists():
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def detect_features(app_json, metadata):
    """app.json + metadata から features (camera / IAP / subscription / AI / login 等) を推定"""
    features = {
        "camera": False,
        "photo_library": False,
        "microphone": False,
        "location": False,
        "iap": False,
        "subscription": False,
        "login": False,
        "ai_content": False,
        "ugc": False,
        "tracking": False,
        "health_data": False,
    }
    if not app_json:
        return features
    expo = app_json.get("expo", {})
    ios = expo.get("ios", {})
    info = ios.get("infoPlist", {})

    if "NSCameraUsageDescription" in info:
        features["camera"] = True
    if "NSPhotoLibraryUsageDescription" in info:
        features["photo_library"] = True
    if "NSMicrophoneUsageDescription" in info:
        features["microphone"] = True
    if any(k.startswith("NSLocation") for k in info.keys()):
        features["location"] = True
    if "NSUserTrackingUsageDescription" in info:
        features["tracking"] = True
    if "NSHealthShareUsageDescription" in info or "NSHealthUpdateUsageDescription" in info:
        features["health_data"] = True

    # Subscription / IAP from plugins or package.json
    plugins = expo.get("plugins", [])
    plugin_names = []
    for p in plugins:
        if isinstance(p, str):
            plugin_names.append(p)
        elif isinstance(p, list) and p:
            plugin_names.append(p[0])
    if "react-native-purchases" in str(plugin_names) or "expo-iap" in str(plugin_names):
        features["iap"] = True
        features["subscription"] = True  # tentative
    # metadata から subscription / IAP もっと確実に判定
    if metadata:
        desc = metadata.get("description_4000char", "") + " " + metadata.get("description", "")
        if any(x in desc.lower() for x in ["subscription", "subscribe", "weekly", "yearly", "monthly", "/週", "/年", "/月", "サブスク"]):
            features["subscription"] = True
        if "$" in desc or "¥" in desc:
            features["iap"] = True

    # AI content (description で AI 言及あれば)
    if metadata:
        desc = metadata.get("description_4000char", "")
        if "AI" in desc or "GPT" in desc or "claude" in desc.lower() or "vision" in desc.lower():
            features["ai_content"] = True

    return features


def check_rule(rule, ctx):
    """1 rule の check → (status, detail) を返す。status: 'pass' / 'fail' / 'skip'"""
    check_type = rule.get("check_type")
    app_json = ctx["app_json"]
    metadata = ctx["metadata"]
    features = ctx["features"]
    expo = (app_json or {}).get("expo", {})
    ios = expo.get("ios", {})
    info = ios.get("infoPlist", {})

    # ---- privacy manifest ----
    if check_type == "app_json_privacy_manifests_exists":
        pm = ios.get("privacyManifests", {})
        api_types = pm.get("NSPrivacyAccessedAPITypes", [])
        if not api_types:
            return ("fail", "ios.privacyManifests.NSPrivacyAccessedAPITypes 未設定")
        return ("pass", f"{len(api_types)} category 申告済")

    if check_type == "app_json_privacy_tracking_explicit":
        pm = ios.get("privacyManifests", {})
        if "NSPrivacyTracking" not in pm:
            return ("fail", "NSPrivacyTracking 未明示")
        return ("pass", f"NSPrivacyTracking={pm.get('NSPrivacyTracking')}")

    if check_type == "app_json_collected_data_types_exists":
        pm = ios.get("privacyManifests", {})
        types = pm.get("NSPrivacyCollectedDataTypes", [])
        if not types:
            return ("fail", "NSPrivacyCollectedDataTypes 未申告")
        return ("pass", f"{len(types)} data type 申告済")

    # ---- permission desc ----
    if check_type == "info_plist_camera_desc_specific":
        if not features["camera"]:
            return ("skip", "camera 未使用")
        desc = info.get("NSCameraUsageDescription", "")
        if not desc:
            return ("fail", "NSCameraUsageDescription 未設定")
        for bad in rule.get("patterns_to_reject", []):
            if bad in desc:
                return ("fail", f"曖昧表現 detected: '{bad}'")
        if len(desc) < 30:
            return ("fail", f"description 短すぎ ({len(desc)} chars)")
        return ("pass", f"{len(desc)} chars 具体的")

    if check_type == "info_plist_photolibrary_desc_specific":
        if not features["photo_library"]:
            return ("skip", "photo library 未使用")
        desc = info.get("NSPhotoLibraryUsageDescription", "")
        if not desc:
            return ("fail", "NSPhotoLibraryUsageDescription 未設定")
        if len(desc) < 30:
            return ("fail", f"短すぎ ({len(desc)} chars)")
        return ("pass", f"{len(desc)} chars")

    if check_type == "info_plist_mic_desc_appropriate":
        if features["camera"] and not features["microphone"]:
            return ("pass", "camera あり / mic 不要 = 削除済 OK")
        if features["microphone"]:
            return ("pass", "mic 明示使用、description あれば OK")
        return ("skip", "mic 未使用")

    # ---- account deletion ----
    if check_type == "account_deletion_present_if_login":
        if not features["login"]:
            return ("skip", "login 機能なし (削除義務なし)")
        # heuristic: settings 画面に delete 系コードがあるか
        # NOTE: 静的 check できないので LLM 判定にまわす
        return ("skip", "manual or LLM check required")

    # ---- ATT ----
    if check_type == "info_plist_att_description_if_tracking":
        if not features["tracking"]:
            return ("pass", "tracking 未使用 = NSUserTrackingUsageDescription 不要")
        if "NSUserTrackingUsageDescription" not in info:
            return ("fail", "tracking 使用なのに NSUserTrackingUsageDescription なし")
        return ("pass", "ATT description あり")

    # ---- AI content ----
    if check_type == "ai_content_label_if_ai_used":
        if not features["ai_content"]:
            return ("skip", "AI 不使用")
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        if "AI" in desc and ("ラベル" in desc or "AI-generated" in desc or "generated by AI" in desc.lower() or "analyzed by AI" in desc.lower() or "AI analyzes" in desc):
            return ("pass", "AI 生成明示あり")
        return ("fail", "AI 使用だが AI 生成 label / 明示なし")

    if check_type == "ai_content_filter_if_ai_generated":
        if not features["ai_content"]:
            return ("skip", "AI 不使用")
        # 内部判断: Worker 側 safety filter 想定
        return ("skip", "manual / LLM 判定 — worker safety filter 確認推奨")

    # ---- UGC ----
    if check_type == "ugc_moderation_present_if_ugc":
        if not features["ugc"]:
            return ("skip", "UGC なし")
        return ("skip", "manual check required")

    # ---- Subscription ----
    if check_type == "subscription_disclosure_complete":
        if not features["subscription"]:
            return ("skip", "サブスクなし")
        if not metadata:
            return ("fail", "metadata 不在")
        desc = metadata.get("description_4000char", "").lower()
        groups = rule.get("phrase_groups", {})
        missing = []
        for group_name, phrases in groups.items():
            if not any(p.lower() in desc for p in phrases):
                missing.append(group_name)
        if missing:
            return ("fail", f"以下 category の明示なし: {', '.join(missing)}")
        return ("pass", f"全 {len(groups)} category (price/auto-renew/cancel) 明示済")

    if check_type == "trial_disclosure_if_trial":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        if "trial" in desc.lower() or "無料トライアル" in desc:
            if "auto-renew" in desc.lower() or "自動課金" in desc or "automatically" in desc.lower():
                return ("pass", "trial + auto-renewal 説明あり")
            return ("fail", "trial あり、auto-renewal 説明なし")
        return ("pass", "trial 不実装 = 不要")

    if check_type == "manage_subscription_link_present":
        # 静的 check 困難、LLM 判定
        return ("skip", "manual / settings 画面 review")

    # ---- IAP ----
    if check_type == "no_external_payment_link":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        for bad in rule.get("patterns_to_reject", []):
            if bad.lower() in desc.lower():
                return ("fail", f"外部決済 link detected: '{bad}'")
        return ("pass", "外部決済 link なし")

    if check_type == "no_misleading_pricing":
        return ("skip", "LLM 判定推奨")

    # ---- Health ----
    if check_type == "no_medical_claim":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        for bad in rule.get("patterns_to_reject", []):
            # avoid false positive: "not medical advice" は OK
            if re.search(rf"(?<!not )(?<!not a )(?<!substitute for a )\b{re.escape(bad)}\b", desc, re.IGNORECASE):
                return ("fail", f"medical claim detected: '{bad}'")
        return ("pass", "medical claim なし")

    if check_type == "no_accuracy_claim":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        for bad in rule.get("patterns_to_reject", []):
            if re.search(rf"\b{re.escape(bad)}\b", desc, re.IGNORECASE):
                return ("fail", f"accuracy claim detected: '{bad}'")
        return ("pass", "accuracy claim なし")

    # ---- Metadata ----
    if check_type == "no_competitor_mention":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "") + " " + str(metadata.get("keywords_100char_total", "")) + " " + str(metadata.get("promotional_text_170char", ""))
        for bad in rule.get("patterns_to_reject", []):
            if bad.lower() in desc.lower():
                return ("fail", f"competitor mention: '{bad}'")
        return ("pass", "competitor mention なし")

    if check_type == "description_implementation_match":
        return ("skip", "LLM 判定推奨")

    if check_type == "app_name_length_30":
        if not metadata:
            return ("skip", "metadata 不在")
        name = metadata.get("name", "")
        if len(name) > 30:
            return ("fail", f"app 名 {len(name)} chars (max 30)")
        return ("pass", f"{len(name)} chars")

    if check_type == "subtitle_length_30":
        if not metadata:
            return ("skip", "metadata 不在")
        sub = metadata.get("subtitle", "")
        if len(sub) > 30:
            return ("fail", f"subtitle {len(sub)} chars (max 30)")
        return ("pass", f"{len(sub)} chars" if sub else "subtitle 未設定")

    if check_type == "keywords_length_100":
        if not metadata:
            return ("skip", "metadata 不在")
        kw = metadata.get("keywords_100char_total", "") or metadata.get("keywords", "")
        if len(kw) > 100:
            return ("fail", f"keywords {len(kw)} chars (max 100)")
        return ("pass", f"{len(kw)} chars")

    if check_type == "promotional_text_length_170":
        if not metadata:
            return ("skip", "metadata 不在")
        pt = metadata.get("promotional_text_170char", "") or metadata.get("promotional_text", "")
        if len(pt) > 170:
            return ("fail", f"promo text {len(pt)} chars (max 170)")
        return ("pass", f"{len(pt)} chars" if pt else "未設定")

    if check_type == "no_trademark_violation":
        if not metadata:
            return ("skip", "metadata 不在")
        name = metadata.get("name", "")
        kw = metadata.get("keywords_100char_total", "") or metadata.get("keywords", "")
        check_text = f"{name} {kw}"
        for bad in rule.get("patterns_to_reject", []):
            if bad.lower() in check_text.lower():
                return ("fail", f"trademark in name/keywords: '{bad}'")
        return ("pass", "trademark 違反なし (name/keywords)")

    # ---- Bundle ID ----
    if check_type == "bundle_id_reverse_dns":
        bid = ios.get("bundleIdentifier", "")
        if not bid:
            return ("fail", "bundleIdentifier 未設定")
        if not re.match(r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$", bid):
            return ("fail", f"逆 DNS 形式に従ってない: {bid}")
        return ("pass", bid)

    if check_type == "url_scheme_unique":
        scheme = expo.get("scheme", "")
        common = {"app", "home", "main", "default"}
        if scheme.lower() in common:
            return ("fail", f"一般語 scheme: {scheme}")
        return ("pass", f"scheme={scheme}" if scheme else "scheme 未設定")

    # ---- Technical ----
    if check_type == "privacy_url_https_present":
        if not metadata:
            return ("skip", "metadata 不在")
        url = metadata.get("privacy_policy_url", "") or metadata.get("privacy_url", "")
        if not url:
            return ("fail", "privacy policy URL 未設定 (metadata.privacy_policy_url)")
        if not url.startswith("https://"):
            return ("fail", f"HTTPS 必須: {url}")
        return ("pass", url)

    if check_type == "support_url_https_present":
        if not metadata:
            return ("skip", "metadata 不在")
        url = metadata.get("support_url", "")
        if not url:
            return ("fail", "support URL 未設定")
        if not url.startswith("https://") and not url.startswith("mailto:"):
            return ("fail", f"HTTPS or mailto: 必須: {url}")
        return ("pass", url)

    if check_type == "info_plist_encryption_explicit":
        if "ITSAppUsesNonExemptEncryption" not in info:
            return ("fail", "ITSAppUsesNonExemptEncryption 未明示")
        return ("pass", f"ITSAppUsesNonExemptEncryption={info.get('ITSAppUsesNonExemptEncryption')}")

    if check_type == "no_emoji_in_display_name":
        name = (metadata or {}).get("name", "") or expo.get("name", "")
        if re.search(r"[\U0001F300-\U0001FAFF☀-➿]", name):
            return ("fail", f"name に絵文字: {name}")
        return ("pass", name)

    # ---- Content rating ----
    if check_type == "age_rating_appropriate":
        if not metadata:
            return ("skip", "metadata 不在")
        rating = metadata.get("age_rating", "") or metadata.get("ageRating", "")
        if not rating:
            return ("skip", "age_rating 未記載 (ASC 直接 manage)")
        return ("pass", f"rating={rating}")

    # ---- Design ----
    if check_type in ("min_functionality_present", "no_spam_duplicate", "not_link_collection"):
        return ("skip", "manual check (architecture / design review)")

    # ---- Review assistance ----
    if check_type == "demo_account_in_review_note_if_login":
        if not features["login"]:
            return ("skip", "login なし")
        return ("skip", "ASC review note 直接確認")

    if check_type == "subscription_review_note_present":
        if not features["subscription"]:
            return ("skip", "サブスクなし")
        return ("skip", "ASC subscription product reviewNote 直接確認")

    if check_type == "subscription_screenshot_present":
        if not features["subscription"]:
            return ("skip", "サブスクなし")
        return ("skip", "ASC subscription product screenshot 直接確認")

    # ---- Safety / OPSEC ----
    if check_type == "sensitive_data_disclosure":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        if "encrypted" in desc.lower() or "暗号" in desc:
            return ("pass", "encryption 言及あり")
        if not (features["health_data"] or features["camera"] or features["photo_library"]):
            return ("skip", "sensitive data なし")
        return ("fail", "sensitive data 扱うが encryption 言及なし")

    if check_type == "training_usage_disclosed":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        if "train" in desc.lower():
            return ("pass", "training 使用方針言及あり")
        if features["ai_content"]:
            return ("fail", "AI 使用だが training データ方針 言及なし")
        return ("skip", "AI 不使用")

    if check_type == "no_personal_info_in_description":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        for bad in rule.get("patterns_to_reject", []):
            if bad in desc:
                return ("fail", f"個人 email detected: '{bad}'")
        return ("pass", "個人情報 leak なし")

    if check_type == "no_workspace_path":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "")
        for bad in rule.get("patterns_to_reject", []):
            if bad in desc:
                return ("fail", f"workspace path detected: '{bad}'")
        return ("pass", "workspace path leak なし")

    if check_type == "no_personal_linked_brand_in_public":
        if not metadata:
            return ("skip", "metadata 不在")
        desc = metadata.get("description_4000char", "") + " " + str(metadata.get("subtitle", ""))
        for bad in rule.get("patterns_to_reject", []):
            if bad.lower() in desc.lower():
                return ("fail", f"個人紐付き brand: '{bad}'")
        return ("pass", "brand 分離 OK")

    if check_type == "primary_locale_set":
        return ("skip", "ASC 直接 manage")

    if check_type == "icon_format_1024_rgb_noalpha":
        icon = expo.get("icon", "")
        if not icon:
            return ("fail", "icon 未設定")
        return ("skip", f"icon={icon} (PIL 検証は別途)")

    if check_type == "icon_no_copyrighted_content":
        return ("skip", "manual check")

    if check_type in ("screenshots_match_implementation", "screenshots_correct_resolution", "screenshots_no_competitor_or_trademark"):
        return ("skip", "screenshot 直接確認")

    if check_type in ("no_launch_crash", "network_error_handling", "api_timeout_set"):
        return ("skip", "実機 / code review")

    if check_type == "description_language_matches_primary_locale":
        if not metadata:
            return ("skip", "metadata 不在")
        primary = metadata.get("primary_locale", "en-US")
        desc = metadata.get("description_4000char", "")
        has_jp = bool(re.search(r"[぀-ヿ一-鿿]", desc))
        if primary.startswith("en") and has_jp:
            return ("fail", "primary=en だが description に日本語混入")
        return ("pass", f"primary={primary}, jp_chars={'yes' if has_jp else 'no'}")

    return ("skip", f"unknown check_type: {check_type}")


def llm_judge(app_dir: Path, app_json, metadata, features):
    """Claude API で context-aware judgement"""
    try:
        from anthropic import Anthropic
    except ImportError:
        return None, "anthropic package not installed (pip install anthropic)"

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None, "ANTHROPIC_API_KEY 環境変数なし"

    system_prompt = """You are an Apple App Store Review Guidelines auditor (2026 latest).

Given an iOS app's metadata and configuration, identify Apple Review Guideline violation risks.

Focus on:
1. description / metadata accuracy vs implementation
2. competitor disparagement (4.0)
3. subjective claims that could trigger reject (medical claims, accuracy boasts, etc.)
4. AI-generated content transparency (1.2 / 4.7.5)
5. subscription disclosure completeness (3.1.2(a))
6. minimum functionality (4.2)
7. spam / duplicate (4.3)
8. health app safety-critical claims (1.4.1)

Output STRICT JSON only (no prose), with this schema:
{
  "rejection_probability": 0.0-1.0,
  "summary": "1-2 sentence summary in 日本語",
  "issues": [
    {
      "guideline": "5.1.2",
      "severity": "critical" | "warning",
      "title": "short title in 日本語",
      "detail": "detailed issue in 日本語",
      "fix": "fix steps in 日本語"
    }
  ]
}
"""
    user_payload = {
        "app_name": (metadata or {}).get("name", "unknown"),
        "bundle_id": ((app_json or {}).get("expo", {}).get("ios", {}).get("bundleIdentifier", "unknown")),
        "category": (metadata or {}).get("category", "unknown"),
        "primary_locale": (metadata or {}).get("primary_locale", "en-US"),
        "description_4000char": (metadata or {}).get("description_4000char", ""),
        "subtitle": (metadata or {}).get("subtitle", ""),
        "keywords": (metadata or {}).get("keywords_100char_total", "") or (metadata or {}).get("keywords", ""),
        "promotional_text": (metadata or {}).get("promotional_text_170char", ""),
        "features_detected": features,
        "price_model": "subscription" if features.get("subscription") else "unknown",
        "info_plist_permissions": {
            k: v for k, v in ((app_json or {}).get("expo", {}).get("ios", {}).get("infoPlist", {}) or {}).items()
            if k.startswith("NS") and k.endswith("Description")
        },
    }

    client = Anthropic(api_key=api_key)
    try:
        msg = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": "Audit this iOS app:\n\n" + json.dumps(user_payload, ensure_ascii=False, indent=2)},
            ],
        )
        text = msg.content[0].text
        # extract JSON block
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            return None, f"LLM 出力に JSON なし: {text[:200]}"
        try:
            parsed = json.loads(m.group(0))
            return parsed, None
        except json.JSONDecodeError as e:
            return None, f"JSON parse error: {e}; raw: {text[:300]}"
    except Exception as e:
        return None, f"Claude API error: {e}"


def render_report(app_name, app_dir, app_json, metadata, features, results, llm_result, llm_error):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = []
    lines.append(f"# Pre-Submission Check: {app_name}")
    lines.append("")
    lines.append(f"**Generated**: {now}")
    lines.append(f"**App dir**: `{app_dir}`")
    lines.append(f"**Bundle ID**: `{(app_json or {}).get('expo', {}).get('ios', {}).get('bundleIdentifier', 'unknown')}`")
    lines.append("")

    # Feature detection
    lines.append("## 検出 features")
    for k, v in features.items():
        mark = "✅" if v else "—"
        lines.append(f"- {mark} {k}")
    lines.append("")

    # Static rule results summary
    n_pass = sum(1 for r in results if r["status"] == "pass")
    n_fail = sum(1 for r in results if r["status"] == "fail")
    n_skip = sum(1 for r in results if r["status"] == "skip")
    n_critical = sum(1 for r in results if r["status"] == "fail" and r["severity"] == "critical")
    n_warning = sum(1 for r in results if r["status"] == "fail" and r["severity"] == "warning")
    lines.append("## Summary")
    lines.append(f"- ❌ CRITICAL fail: **{n_critical}**")
    lines.append(f"- ⚠️ WARNING fail: **{n_warning}**")
    lines.append(f"- ✅ PASS: {n_pass}")
    lines.append(f"- ⏭️ SKIP (manual / inapplicable): {n_skip}")
    lines.append(f"- Total rules: {len(results)}")
    if llm_result:
        lines.append(f"- 🤖 LLM rejection probability: **{llm_result.get('rejection_probability', '?')}**")
    lines.append("")

    # CRITICAL fails
    crit = [r for r in results if r["status"] == "fail" and r["severity"] == "critical"]
    if crit:
        lines.append("## ❌ CRITICAL — must fix before submit")
        lines.append("")
        for r in crit:
            lines.append(f"### {r['id']} — {r['title']}")
            lines.append(f"- **Guideline**: {r['guideline']}")
            lines.append(f"- **Detail**: {r['detail']}")
            lines.append(f"- **Fix**: {r['fix']}")
            lines.append("")

    # WARNING fails
    warn = [r for r in results if r["status"] == "fail" and r["severity"] == "warning"]
    if warn:
        lines.append("## ⚠️ WARNING — recommend to fix")
        lines.append("")
        for r in warn:
            lines.append(f"### {r['id']} — {r['title']}")
            lines.append(f"- **Guideline**: {r['guideline']}")
            lines.append(f"- **Detail**: {r['detail']}")
            lines.append(f"- **Fix**: {r['fix']}")
            lines.append("")

    # LLM judgement
    if llm_result:
        lines.append("## 🤖 LLM (Claude) Semantic Audit")
        lines.append("")
        lines.append(f"**Summary**: {llm_result.get('summary', '?')}")
        lines.append(f"**Rejection probability**: {llm_result.get('rejection_probability', '?')}")
        lines.append("")
        for issue in llm_result.get("issues", []):
            sev = issue.get("severity", "warning")
            mark = "❌" if sev == "critical" else "⚠️"
            lines.append(f"### {mark} {issue.get('title', '?')}")
            lines.append(f"- **Guideline**: {issue.get('guideline', '?')}")
            lines.append(f"- **Severity**: {sev}")
            lines.append(f"- **Detail**: {issue.get('detail', '?')}")
            lines.append(f"- **Fix**: {issue.get('fix', '?')}")
            lines.append("")
    elif llm_error:
        lines.append("## 🤖 LLM (Claude) Semantic Audit")
        lines.append("")
        lines.append(f"⚠️ Skipped: {llm_error}")
        lines.append("")

    # PASS (collapsed)
    passed = [r for r in results if r["status"] == "pass"]
    lines.append("<details>")
    lines.append(f"<summary>✅ PASS ({len(passed)} rules)</summary>")
    lines.append("")
    for r in passed:
        lines.append(f"- **{r['id']}** {r['title']} — {r['detail']}")
    lines.append("")
    lines.append("</details>")
    lines.append("")

    # SKIPPED (collapsed)
    skipped = [r for r in results if r["status"] == "skip"]
    lines.append("<details>")
    lines.append(f"<summary>⏭️ SKIP ({len(skipped)} rules — manual / inapplicable)</summary>")
    lines.append("")
    for r in skipped:
        lines.append(f"- **{r['id']}** {r['title']} — {r['detail']}")
    lines.append("")
    lines.append("</details>")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("Generated by `.claude/skills/pre-submission-check/check.py`")
    lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Pre-submission check for iOS apps")
    parser.add_argument("app_dir", help="App directory (e.g., apps/mirrorbite)")
    parser.add_argument("--output", "-o", help="Output markdown report path")
    parser.add_argument("--no-llm", action="store_true", help="Skip Claude API semantic audit")
    args = parser.parse_args()

    app_dir = Path(args.app_dir).resolve()
    if not app_dir.is_dir():
        print(f"Error: app_dir not found: {app_dir}", file=sys.stderr)
        sys.exit(1)

    app_name = app_dir.name
    print(f"[check] app: {app_name}", file=sys.stderr)

    app_json = load_app_json(app_dir)
    metadata = load_metadata_json(app_dir)
    if not app_json:
        print(f"[warn] app.json not found", file=sys.stderr)
    if not metadata:
        print(f"[warn] store/metadata.json not found", file=sys.stderr)

    features = detect_features(app_json, metadata)
    print(f"[check] features: {[k for k, v in features.items() if v]}", file=sys.stderr)

    rules = load_rules()
    ctx = {"app_json": app_json, "metadata": metadata, "features": features}
    results = []
    for rule in rules["rules"]:
        status, detail = check_rule(rule, ctx)
        results.append({
            "id": rule["id"],
            "title": rule["title"],
            "category": rule["category"],
            "guideline": rule["guideline"],
            "severity": rule["severity"],
            "fix": rule["fix"],
            "status": status,
            "detail": detail,
        })

    n_fail = sum(1 for r in results if r["status"] == "fail")
    print(f"[check] static rules: {len(results)} run, {n_fail} fail", file=sys.stderr)

    llm_result = None
    llm_error = None
    if not args.no_llm:
        print(f"[check] running LLM semantic audit (Claude API)...", file=sys.stderr)
        llm_result, llm_error = llm_judge(app_dir, app_json, metadata, features)
        if llm_error:
            print(f"[warn] LLM: {llm_error}", file=sys.stderr)
        elif llm_result:
            print(f"[check] LLM issues: {len(llm_result.get('issues', []))}", file=sys.stderr)

    report = render_report(app_name, app_dir, app_json, metadata, features, results, llm_result, llm_error)

    if args.output:
        out_path = Path(args.output).resolve()
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")
        out_path = WORKSPACE_ROOT / "generated" / "research" / "ship-check-reports" / f"{date_str}-{app_name}.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"[check] report: {out_path}", file=sys.stderr)
    print(str(out_path))


if __name__ == "__main__":
    main()
