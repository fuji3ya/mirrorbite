/**
 * Mirrorbite — AsyncStorage key registry (central).
 * すべての永続化 key はここで定義し、各 module は名前で参照する。
 * 衝突防止と migration を一元管理。
 */
export const StorageKeys = {
  // Onboarding state machine (Frame 0 / Act 1-3)
  ONBOARDING_STATE: 'mb.onboarding.state.v1',
  ONBOARDING_PRIVACY_SEEN: 'mb.onboarding.privacy_seen.v1',

  // Reveal history (ring buffer up to N items)
  REVEAL_HISTORY: 'mb.reveal.history.v1',
  REVEAL_LAST: 'mb.reveal.last.v1',

  // Purchase / paywall state — ENTITLEMENT_ACTIVE mirrors the Apple
  // subscription and is intentionally NOT cleared by clearAllAppData.
  ENTITLEMENT_ACTIVE: 'mb.entitlement.active.v1',

  // 2026-05-28 removed dead keys (no setItem/getItem anywhere):
  //   PAYWALL_DISMISSED_COUNT — declared, never written, only listed in
  //     clearAllAppData's removal list (no-op).
  //   USER_PROFILE — was intended to back goal_hint/eat_out_frequency, which
  //     were themselves dead UI (see feedback_data_captured_ne_data_consumed).
  //   THEME_OVERRIDE — no theme toggle UI ever shipped.
  // Re-add when (and only when) the consumer ships in the SAME PR.
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
