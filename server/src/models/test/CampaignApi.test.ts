import { describe, expect, it } from 'vitest';

import { isSendDateReached, isSendDateInFuture } from '~/models/CampaignApi';

describe('isSendDateReached', () => {
  const today = '2026-07-15';

  it('returns false when sentAt is null', () => {
    expect(isSendDateReached(null, today)).toBe(false);
  });

  it('returns false when sentAt is in the future', () => {
    expect(isSendDateReached('2026-07-16', today)).toBe(false);
  });

  it('returns true when sentAt is today', () => {
    expect(isSendDateReached('2026-07-15', today)).toBe(true);
  });

  it('returns true when sentAt is in the past', () => {
    expect(isSendDateReached('2026-07-14', today)).toBe(true);
  });

  it('truncates a longer ISO sentAt before comparing', () => {
    expect(isSendDateReached('2026-07-15T23:59:59.000Z', today)).toBe(true);
  });
});

describe('isSendDateInFuture', () => {
  const today = '2026-07-23';

  it('returns false when sentAt is null', () => {
    expect(isSendDateInFuture(null, today)).toBe(false);
  });

  it('returns false when sentAt is today', () => {
    expect(isSendDateInFuture('2026-07-23', today)).toBe(false);
  });

  it('returns false when sentAt is in the past', () => {
    expect(isSendDateInFuture('2020-01-01', today)).toBe(false);
  });

  it('returns true when sentAt is strictly after today', () => {
    expect(isSendDateInFuture('2999-01-01', today)).toBe(true);
  });

  it('truncates a longer ISO sentAt before comparing', () => {
    expect(isSendDateInFuture('2999-01-01T23:59:59.000Z', today)).toBe(true);
  });
});
