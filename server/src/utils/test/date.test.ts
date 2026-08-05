import { afterEach, describe, expect, it, vi } from 'vitest';

import { today } from '~/utils/date';

describe('today', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current date as a yyyy-MM-dd string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the Europe/Paris calendar date, not the server-local one, near UTC midnight', () => {
    // 2026-01-15T23:30:00Z is still 2026-01-15 in UTC, but already
    // 2026-01-16 00:30 in Europe/Paris (UTC+1 in winter) — the day French
    // caseworkers actually see.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T23:30:00Z'));

    expect(today()).toBe('2026-01-16');
  });

  it('accounts for CEST (UTC+2) in summer', () => {
    // 2026-07-14T22:30:00Z is 2026-07-14 in UTC, but already
    // 2026-07-15 00:30 in Europe/Paris (UTC+2 in summer).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T22:30:00Z'));

    expect(today()).toBe('2026-07-15');
  });
});
