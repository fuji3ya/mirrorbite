/**
 * Mirrorbite — Vision API client (mock + real switch)
 *
 * Mock mode: returns weighted random sample (HTML prototype と同じ 6 sample)
 * Real mode: fetch /api/vision (Cloudflare Worker proxy)
 *
 * spec: generated/research/mirrorbite/day2/gpt4-vision-prompt-template.md
 * cost plan: generated/research/mirrorbite/day2-buildup/pricing-matrix-regional.md §11
 */

import type { Axis, AxisLevel } from './theme';

export type Judgement = 'delivered' | 'withheld';
export type Confidence = 'high' | 'medium' | 'low';
export type WithheldReason =
  | 'photo_unclear'
  | 'non_food'
  | 'multiple_meals'
  | 'unidentified_dish'
  | 'other';

export interface RevealResult {
  version: 'v0.1';
  judgement: Judgement;
  withheld_reason: WithheldReason | null;
  score: number | null;             // 0-100
  score_caption: string | null;
  axes: Record<Axis, AxisLevel> | null;
  strength_bullet: string | null;
  improvement_bullet: string | null;
  next_action_cta: string | null;
  identified_dish: string | null;
  confidence: Confidence;
}

// === MOCK SAMPLES ===
const SAMPLES: Record<string, RevealResult> = {
  delivered_caesar: {
    version: 'v0.1',
    judgement: 'delivered',
    withheld_reason: null,
    score: 72,
    score_caption: 'Directional fit to a balanced-nutrition goal.',
    axes: { protein: 'good', carb_balance: 'caution', fiber: 'low' },
    strength_bullet: 'Solid lean-protein source from the chicken.',
    improvement_bullet: 'Add a side of beans at dinner — fiber like that could meaningfully lift your index.',
    next_action_cta: 'Try at dinner',
    identified_dish: 'Chicken caesar salad',
    confidence: 'high',
  },
  delivered_ramen: {
    version: 'v0.1',
    judgement: 'delivered',
    withheld_reason: null,
    score: 54,
    score_caption: 'Directional — leans carb-heavy for a balanced goal.',
    axes: { protein: 'caution', carb_balance: 'low', fiber: 'low' },
    strength_bullet: 'Warm comfort meal with some egg protein.',
    improvement_bullet: 'Tomorrow lunch — a leafy side could meaningfully balance things out.',
    next_action_cta: 'Plan tomorrow',
    identified_dish: 'Tonkotsu ramen',
    confidence: 'high',
  },
  delivered_lowconf: {
    version: 'v0.1',
    judgement: 'delivered',
    withheld_reason: null,
    score: 64,
    score_caption: "Directional — I'm less sure about this one.",
    axes: { protein: 'caution', carb_balance: 'good', fiber: 'good' },
    strength_bullet: 'Looks vegetable-forward, which leans well.',
    improvement_bullet: 'Tomorrow lunch: add a clearer protein source.',
    next_action_cta: 'Save for tomorrow',
    identified_dish: 'Mixed grain bowl (best guess)',
    confidence: 'low',
  },
  withheld_blurry: {
    version: 'v0.1',
    judgement: 'withheld',
    withheld_reason: 'photo_unclear',
    score: null,
    score_caption: null,
    axes: null,
    strength_bullet: null,
    improvement_bullet: null,
    next_action_cta: null,
    identified_dish: null,
    confidence: 'low',
  },
  withheld_nonfood: {
    version: 'v0.1',
    judgement: 'withheld',
    withheld_reason: 'non_food',
    score: null,
    score_caption: null,
    axes: null,
    strength_bullet: null,
    improvement_bullet: null,
    next_action_cta: null,
    identified_dish: null,
    confidence: 'low',
  },
  withheld_multi: {
    version: 'v0.1',
    judgement: 'withheld',
    withheld_reason: 'multiple_meals',
    score: null,
    score_caption: null,
    axes: null,
    strength_bullet: null,
    improvement_bullet: null,
    next_action_cta: null,
    identified_dish: null,
    confidence: 'low',
  },
};

export const WITHHELD_COPY: Record<WithheldReason, string> = {
  photo_unclear:     "The photo's a bit blurry — I won't guess on a meal I can't read clearly.",
  non_food:          "I can't see a meal here. Tap retake when you're ready.",
  multiple_meals:    'Looks like more than one meal — split into separate captures.',
  // 'add a label' feature is not yet implemented; copy avoids promising it.
  unidentified_dish: "I held back this one — a clearer shot in good light usually does it.",
  other:             "I held back this one. Try a clearer shot in good light.",
};

/**
 * analyzeMeal — pluggable Vision client.
 *
 * Behavior matrix:
 * - DEV (__DEV__=true) + no env → mockAnalyze() (HTML prototype-equivalent samples)
 * - DEV + env → real proxy, errors surface to caller (no mock fallback in dev either, so we see failures)
 * - PROD + no env → throws ConfigurationError (build is broken, fail loudly)
 * - PROD + env → real proxy, errors surface to caller as AnalysisError; UI handles network/timeout UX
 *
 * Real proxy (CF Worker) は image as base64 dataURL を受け取り、
 * Gemini 2.5 Flash → Claude Sonnet 4 cascade で reveal result を返す。
 * spec: apps/mirrorbite-worker/README.md
 */
export class ConfigurationError extends Error {
  constructor(msg: string) { super(msg); this.name = 'ConfigurationError'; }
}
export class AnalysisError extends Error {
  readonly code: 'network' | 'timeout' | 'server' | 'invalid';
  constructor(code: 'network' | 'timeout' | 'server' | 'invalid', msg: string) {
    super(msg);
    this.name = 'AnalysisError';
    this.code = code;
  }
}

export async function analyzeMeal(opts: {
  imageDataURL?: string;
  goalHint?: string;
  locale?: string;
  signal?: AbortSignal;
}): Promise<RevealResult> {
  const url = process.env.EXPO_PUBLIC_VISION_API_URL;
  const clientSecret = process.env.EXPO_PUBLIC_MB_CLIENT_SECRET;
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

  // Production must have the URL configured. Refuse to silently serve mock data.
  if (!url && !isDev) {
    throw new ConfigurationError(
      'EXPO_PUBLIC_VISION_API_URL is not set in this build. Production build cannot run on mock data.',
    );
  }

  // Dev fallback to mock when env not set (so the local UI is still demoable).
  if (!url || !opts.imageDataURL) {
    return mockAnalyze();
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientSecret) headers['x-mb-client-secret'] = clientSecret;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: opts.imageDataURL,
        goal_hint: opts.goalHint ?? 'balanced',
        locale: opts.locale ?? 'en',
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      throw new AnalysisError('server', `vision_api_${res.status}`);
    }
    const data = (await res.json()) as RevealResult;
    return data;
    // NOTE: client-side regex sanitize removed — Worker's semanticValidate is canonical.
    // Adding a second regex on the client risked stripping legitimate strings like "8 grams of fiber".
  } catch (e: unknown) {
    if (e instanceof AnalysisError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort|timeout/i.test(msg)) throw new AnalysisError('timeout', msg);
    throw new AnalysisError('network', msg);
  }
}

/** Mock 関数 — 1.5-3s 遅延 + weighted random pick (HTML prototype と同じロジック) */
async function mockAnalyze(): Promise<RevealResult> {
  const delay = 1500 + Math.random() * 1500;
  await new Promise((r) => setTimeout(r, delay));
  const r = Math.random();
  let key: string;
  if (r < 0.6) key = 'delivered_caesar';
  else if (r < 0.8) key = 'delivered_ramen';
  else if (r < 0.9) key = 'delivered_lowconf';
  else {
    const withheldKeys = ['withheld_blurry', 'withheld_nonfood', 'withheld_multi'];
    key = withheldKeys[Math.floor(Math.random() * withheldKeys.length)];
  }
  return SAMPLES[key];
}

export function getSampleByKey(key: string): RevealResult | undefined {
  return SAMPLES[key];
}

export const SAMPLE_KEYS = Object.keys(SAMPLES);
