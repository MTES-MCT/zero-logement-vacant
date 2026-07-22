import { describe, expect, it } from 'vitest';

import { getSessionExpiration } from '~/infra/session-policy';

describe('getSessionExpiration', () => {
  it('keeps a session active for eight hours after its latest activity', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const activityAt = new Date('2026-01-02T12:00:00.000Z');

    const expiresAt = getSessionExpiration({ createdAt, activityAt });

    expect(expiresAt).toEqual(new Date('2026-01-02T20:00:00.000Z'));
  });

  it('never extends a session beyond thirty days after its creation', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const activityAt = new Date('2026-01-30T20:00:00.000Z');

    const expiresAt = getSessionExpiration({ createdAt, activityAt });

    expect(expiresAt).toEqual(new Date('2026-01-31T00:00:00.000Z'));
  });
});
