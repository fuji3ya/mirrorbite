/**
 * Mirrorbite — Onboarding state machine
 *
 * 9 step (固定):
 *   privacy → a1_goal → a1_eatout → a2_baseline → a2_mystery → a3_processing
 *   → reveal_delivered → paywall → completed (camera home)
 *
 * spec: generated/research/mirrorbite/day2-buildup/onboarding-3act-spec.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storage-keys';

export type OnboardingStep =
  | 'privacy'
  | 'a1_goal'
  | 'a1_eatout'
  | 'a2_baseline'
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
  baseline_meals: {
    bf: string | null;
    ln: string | null;
    dn: string | null;
  };
  started_at: number;
  completed_at: number | null;
}

export const defaultOnboardingState = (): OnboardingState => ({
  step: 'privacy',
  goal_hint: null,
  eat_out_frequency: null,
  baseline_meals: { bf: null, ln: null, dn: null },
  started_at: Date.now(),
  completed_at: null,
});

export const STEP_ORDER: OnboardingStep[] = [
  'privacy',
  'a1_goal',
  'a1_eatout',
  'a2_baseline',
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
  if (step === 'a1_goal') return 25;
  if (step === 'a1_eatout') return 50;
  if (step === 'a2_baseline') return 75;
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
