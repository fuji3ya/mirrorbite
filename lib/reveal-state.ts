/**
 * Mirrorbite — Reveal state (history ring buffer + last captured + last real result)
 *
 * - history: 最新 4 件、{id, ts, photoUri, sampleKey, dish, resultId?}
 * - capturedPhotoUri: 直近撮影/選択写真の local URI (FileSystem.cacheDirectory)
 * - results map: resultId → RevealResult。real Worker レスポンスを丸ごと保存し、
 *   reveal screen が sample key fallback ではなく real result を表示できるようにする
 *
 * spec: prototype/index.html captureAndAnalyze() の RN 移植
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RevealResult } from './gpt4-vision';
import { StorageKeys } from './storage-keys';

export interface HistoryEntry {
  id: string;
  ts: number;
  photoUri: string;       // local file:// URI
  sampleKey: string | null; // gpt4-vision SAMPLES key (mock fallback)
  resultId: string | null;  // key in results map for real Worker response
  dish: string | null;
}

// v1.0 had MAX_HISTORY=4 (camera-home thumb strip only). Library tab needs a
// real archive — 50 entries ≈ 2 months at avg 1 reveal/day, plenty for v1.
const MAX_HISTORY = 50;
const RESULTS_KEY = 'mirrorbite:reveal_results_v1';
const MAX_RESULTS = 50;

/**
 * Free-tier monthly reveal quota.
 * Non-Pro users get FREE_REVEALS_PER_MONTH reveals per calendar month
 * (resets on the 1st of each month). Pro subscribers are unlimited.
 *
 * Storage shape: { month: 'YYYY-MM', count: N }
 * We key by YYYY-MM so a new month auto-resets without explicit cleanup.
 *
 * Increment policy: only delivered reveals consume a free credit.
 * Withheld results (photo_unclear / non_food / etc.) do NOT consume a credit —
 * the user got no value, so they keep their attempt.
 */
export const FREE_REVEALS_PER_MONTH = 3;
const FREE_REVEALS_KEY = 'mirrorbite:freeRevealsUsage_v1';

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getFreeRevealsRemaining(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FREE_REVEALS_KEY);
    if (!raw) return FREE_REVEALS_PER_MONTH;
    const { month, count } = JSON.parse(raw);
    if (month !== currentMonthKey()) return FREE_REVEALS_PER_MONTH;
    return Math.max(0, FREE_REVEALS_PER_MONTH - count);
  } catch {
    return FREE_REVEALS_PER_MONTH;
  }
}

export async function incrementFreeRevealCount(): Promise<void> {
  let count = 0;
  try {
    const raw = await AsyncStorage.getItem(FREE_REVEALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.month === currentMonthKey()) count = parsed.count;
    }
  } catch {
    // start fresh on parse error
  }
  await AsyncStorage.setItem(
    FREE_REVEALS_KEY,
    JSON.stringify({ month: currentMonthKey(), count: count + 1 })
  );
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.REVEAL_HISTORY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export async function pushHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const cur = await loadHistory();
  const next = [entry, ...cur].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(StorageKeys.REVEAL_HISTORY, JSON.stringify(next));
  return next;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(StorageKeys.REVEAL_HISTORY);
}

/**
 * Apple Guideline 5.1.1(v) — provide an in-app data-deletion path.
 * Mirrorbite has no remote account, so this clears all on-device data:
 * history, last capture, real result cache, onboarding flags.
 * Subscription cancellation must still happen via Apple ID Settings.
 */
export async function clearAllAppData(): Promise<void> {
  const keys = [
    StorageKeys.REVEAL_HISTORY,
    StorageKeys.REVEAL_LAST,
    StorageKeys.ONBOARDING_STATE,
    StorageKeys.ONBOARDING_PRIVACY_SEEN,
    StorageKeys.PAYWALL_DISMISSED_COUNT,
    StorageKeys.USER_PROFILE,
    StorageKeys.THEME_OVERRIDE,
    RESULTS_KEY,
  ];
  // Use sequential removeItem instead of multiRemove (which isn't in the typed surface
  // of @react-native-async-storage/async-storage v2 default export).
  await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
  // NOTE: We deliberately do NOT clear ENTITLEMENT_ACTIVE — that mirrors the
  // Apple subscription, which the user must cancel separately via Settings.
}

export async function setLastCapture(photoUri: string, sampleKey?: string): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.REVEAL_LAST, JSON.stringify({ photoUri, sampleKey, ts: Date.now() }));
}

export async function getLastCapture(): Promise<{ photoUri: string; sampleKey?: string; ts: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.REVEAL_LAST);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save the real RevealResult from the Worker so the reveal screen can render
 * the actual analysis (not a sample fallback). Results are keyed by resultId
 * and stored in a tiny LRU map capped at MAX_RESULTS.
 */
export async function saveResult(resultId: string, result: RevealResult): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(RESULTS_KEY);
    const map: Record<string, RevealResult> = raw ? JSON.parse(raw) : {};
    map[resultId] = result;
    // Trim to MAX_RESULTS, keeping most recent by insertion order
    const keys = Object.keys(map);
    if (keys.length > MAX_RESULTS) {
      const trimmed: Record<string, RevealResult> = {};
      for (const k of keys.slice(-MAX_RESULTS)) trimmed[k] = map[k];
      await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(trimmed));
    } else {
      await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(map));
    }
  } catch {
    // Non-fatal: reveal will fall back to sample if save fails
  }
}

export async function loadResult(resultId: string): Promise<RevealResult | null> {
  try {
    const raw = await AsyncStorage.getItem(RESULTS_KEY);
    if (!raw) return null;
    const map: Record<string, RevealResult> = JSON.parse(raw);
    return map[resultId] ?? null;
  } catch {
    return null;
  }
}

/**
 * Load the entire results map in one AsyncStorage read.
 *
 * Trends + Library aggregations otherwise do N×loadResult, each of which
 * re-reads + JSON.parse the FULL map. With MAX_RESULTS=50 that's 50 redundant
 * parses on the hot path. Single-shot read + in-memory lookup eliminates it.
 */
export async function loadAllResults(): Promise<Record<string, RevealResult>> {
  try {
    const raw = await AsyncStorage.getItem(RESULTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, RevealResult>;
  } catch {
    return {};
  }
}

export function formatAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
