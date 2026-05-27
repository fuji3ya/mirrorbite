/**
 * Mirrorbite — Onboarding state machine
 *
 * 8 step (固定, 2026-05-27 a2_baseline 削除後):
 *   privacy → a1_goal → a1_eatout → a2_mystery → a3_processing
 *   → reveal_delivered → paywall → completed (camera home)
 *
 * a2_baseline (Your last 3 meals) was removed 2026-05-27 — the captured
 * `baseline_meals` data was never consumed by the Worker, reveal, or any
 * downstream surface (pure visual padding). Removing the step shortens
 * onboarding from 4 to 3 user-interaction steps and cuts a drop-off point.
 *
 * spec: generated/research/mirrorbite/day2-buildup/onboarding-3act-spec.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storage-keys';

export type OnboardingStep =
  | 'privacy'
  | 'a1_goal'
  | 'a1_eatout'
  | 'a2_mystery'
  | 'a3_processing'
  | 'reveal_delivered'
  | 'paywall'
  | 'completed';

export type GoalHint = 'balanced' | 'fiber_focus' | 'higher_protein' | 'lower_carb';
export type EatOutFreq = 'rare' | 'weekly' | 'daily';

export interface OnboardingState {
  step: OnboardingStep;
  goal_hint: GoalHint | null;
  eat_out_frequency: EatOutFreq | null;
  started_at: number;
  completed_at: number | null;
}

export const defaultOnboardingState = (): OnboardingState => ({
  step: 'privacy',
  goal_hint: null,
  eat_out_frequency: null,
  started_at: Date.now(),
  completed_at: null,
});

export const STEP_ORDER: OnboardingStep[] = [
  'privacy',
  'a1_goal',
  'a1_eatout',
  'a2_mystery',
  'a3_processing',
  'reveal_delivered',
  'paywall',
  'completed',
];

export function nextStep(current: OnboardingStep): OnboardingStep {
  const i = STEP_ORDER.indexOf(current);
  if (i < 0 || i >= STEP_ORDER.length - 1) return 'completed';
  return STEP_ORDER[i + 1];
}

export function progressPercent(step: OnboardingStep): number {
  if (step === 'privacy') return 0;
  if (step === 'a1_goal') return 33;
  if (step === 'a1_eatout') return 66;
  if (step === 'a2_mystery') return 95;
  return 100;
}

export async function loadOnboardingState(): Promise<OnboardingState> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.ONBOARDING_STATE);
    if (!raw) return defaultOnboardingState();
    return { ...defaultOnboardingState(), ...JSON.parse(raw) };
  } catch {
    return defaultOnboardingState();
  }
}

export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.ONBOARDING_STATE, JSON.stringify(state));
}

export async function resetOnboardingState(): Promise<void> {
  await AsyncStorage.removeItem(StorageKeys.ONBOARDING_STATE);
  await AsyncStorage.removeItem(StorageKeys.ONBOARDING_PRIVACY_SEEN);
}

export async function markPrivacySeen(): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.ONBOARDING_PRIVACY_SEEN, '1');
}

export async function isPrivacySeen(): Promise<boolean> {
  const v = await AsyncStorage.getItem(StorageKeys.ONBOARDING_PRIVACY_SEEN);
  return v === '1';
}
