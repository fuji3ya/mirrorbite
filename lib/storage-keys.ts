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

  // Purchase / paywall state
  PAYWALL_DISMISSED_COUNT: 'mb.paywall.dismissed_count.v1',
  ENTITLEMENT_ACTIVE: 'mb.entitlement.active.v1',

  // User profile (locale + goal_hint + eat_out_frequency)
  USER_PROFILE: 'mb.user.profile.v1',

  // Theme override (system / light / dark)
  THEME_OVERRIDE: 'mb.theme.override.v1',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
