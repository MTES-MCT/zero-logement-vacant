import { describe, expect, it } from 'vitest';

import { resolveAuthV2State, resolveFeatureFlag } from './featureFlags';

describe('resolveFeatureFlag', () => {
  it('uses the local fallback only when PostHog has no value yet', () => {
    expect(resolveFeatureFlag('auth-v2', undefined, ['auth-v2'])).toBe(true);
    expect(resolveFeatureFlag('auth-v2', undefined, [])).toBe(false);
  });

  it('keeps explicit PostHog values over the local fallback', () => {
    expect(resolveFeatureFlag('auth-v2', false, ['auth-v2'])).toBe(false);
    expect(resolveFeatureFlag('auth-v2', true, [])).toBe(true);
  });
});

describe('resolveAuthV2State', () => {
  it('suppresses legacy JWT headers while a PostHog-only rollout is unresolved', () => {
    expect(resolveAuthV2State(undefined, [], true)).toEqual({
      isEnabled: false,
      isPending: true,
      suppressLegacyAuthHeaders: true
    });
  });

  it('enables auth-v2 immediately when it is bootstrapped locally', () => {
    expect(resolveAuthV2State(undefined, ['auth-v2'], true)).toEqual({
      isEnabled: true,
      isPending: false,
      suppressLegacyAuthHeaders: true
    });
  });

  it('allows legacy JWT headers only when auth-v2 is resolved or unavailable', () => {
    expect(resolveAuthV2State(false, ['auth-v2'], true)).toEqual({
      isEnabled: false,
      isPending: false,
      suppressLegacyAuthHeaders: false
    });
    expect(resolveAuthV2State(undefined, [], false)).toEqual({
      isEnabled: false,
      isPending: false,
      suppressLegacyAuthHeaders: false
    });
  });
});
