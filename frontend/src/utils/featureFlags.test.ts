import { describe, expect, it } from 'vitest';

import { resolveFeatureFlag } from './featureFlags';

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
