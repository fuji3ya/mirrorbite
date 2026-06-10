import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const EVENTS_KEY = 'mb.review.events';
const ASKED_KEY = 'mb.review.asked';

/**
 * Record one "value moment" (a real reveal delivered) and, the second time it
 * happens, ask for an App Store rating — once per install, at the moment the
 * user has just received value. iOS itself caps prompts at 3/year, but we stay
 * far under that on purpose: a prompt that interrupts a first impression costs
 * more stars than it earns.
 */
export async function recordValueMomentAndMaybeAskReview(): Promise<void> {
  try {
    const [rawCount, asked] = await Promise.all([
      AsyncStorage.getItem(EVENTS_KEY),
      AsyncStorage.getItem(ASKED_KEY),
    ]);
    const count = (Number.parseInt(rawCount ?? '0', 10) || 0) + 1;
    await AsyncStorage.setItem(EVENTS_KEY, String(count));
    if (asked === '1' || count < 2) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    // Mark asked BEFORE requesting — a re-render mid-prompt must not double-ask.
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await StoreReview.requestReview();
  } catch {
    // Rating is a bonus; it must never break the reveal experience.
  }
}
