import { describe, expect, it } from 'vitest';

import { resolveFeatureFlag } from './featureFlags';

describe('resolveFeatureFlag', () => {
  it('uses the local fallback only when PostHog has no value yet', () => {
    expect(
      resolveFeatureFlag('new-analysis-page', undefined, [
        'new-analysis-page'
      ])
    ).toBe(true);
    expect(resolveFeatureFlag('new-analysis-page', undefined, [])).toBe(false);
  });

  it('keeps explicit PostHog values over the local fallback', () => {
    expect(
      resolveFeatureFlag('new-analysis-page', false, ['new-analysis-page'])
    ).toBe(false);
    expect(resolveFeatureFlag('new-analysis-page', true, [])).toBe(true);
  });
});
