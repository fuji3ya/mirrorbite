/**
 * Mirrorbite — Onboarding state machine
 *
 * 6 step (固定, 2026-05-28 a1_goal / a1_eatout 削除後):
 *   privacy → a2_mystery → a3_processing → reveal_delivered → paywall → completed
 *
 * REMOVED 2026-05-28: a1_goal, a1_eatout, a2_baseline — all three were "data
 * captured but never consumed" pages. `goal_hint` was saved to AsyncStorage but
 * processing.tsx never passed it to analyzeMeal (Worker always received the
 * "balanced" default). `eat_out_frequency` and `baseline_meals` had no consumer
 * at all. See feedback_data_captured_ne_data_consumed.md for the postmortem.
 *
 * Onboarding is now consent (privacy) + sample reveal (mystery → reveal). When
 * personalization is ready to actually plumb through to the Worker, add the
 * relevant question back AND wire the consumer in the SAME PR (verified by a
 * test that asserts the request body carries the value).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from './storage-keys';

export type OnboardingStep =
  | 'privacy'
  | 'a2_mystery'
  | 'a3_processing'
  | 'reveal_delivered'
  | 'paywall'
  | 'completed';

export interface OnboardingState {
  step: OnboardingStep;
  started_at: number;
  completed_at: number | null;
}

export const defaultOnboardingState = (): OnboardingState => ({
  step: 'privacy',
  started_at: Date.now(),
  completed_at: null,
});

export const STEP_ORDER: OnboardingStep[] = [
  'privacy',
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
  if (step === 'a2_mystery') return 50;
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
