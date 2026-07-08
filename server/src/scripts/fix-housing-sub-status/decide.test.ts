import { HousingStatus } from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import { decide, decodeStatusLabel, requiresSubStatus } from './decide';

function base(overrides = {}) {
  return {
    geoCode: '01001',
    id: 'h1',
    status: HousingStatus.COMPLETED,
    dataFileYears: [] as string[],
    latestEvent: null,
    ...overrides
  };
}

describe('requiresSubStatus', () => {
  it('is true for FIRST_CONTACT, IN_PROGRESS, COMPLETED, BLOCKED', () => {
    expect(requiresSubStatus(HousingStatus.FIRST_CONTACT)).toBe(true);
    expect(requiresSubStatus(HousingStatus.IN_PROGRESS)).toBe(true);
    expect(requiresSubStatus(HousingStatus.COMPLETED)).toBe(true);
    expect(requiresSubStatus(HousingStatus.BLOCKED)).toBe(true);
  });

  it('is false for NEVER_CONTACTED and WAITING', () => {
    expect(requiresSubStatus(HousingStatus.NEVER_CONTACTED)).toBe(false);
    expect(requiresSubStatus(HousingStatus.WAITING)).toBe(false);
  });
});

describe('decodeStatusLabel', () => {
  it('maps a French label to its status', () => {
    expect(decodeStatusLabel('Suivi terminé')).toBe(HousingStatus.COMPLETED);
    expect(decodeStatusLabel('Non suivi')).toBe(HousingStatus.NEVER_CONTACTED);
  });

  it('returns undefined for missing or unknown labels', () => {
    expect(decodeStatusLabel(undefined)).toBeUndefined();
    expect(decodeStatusLabel('nope')).toBeUndefined();
    expect(decodeStatusLabel('completed')).toBeUndefined(); // kebab is out of scope
  });
});

describe('decide', () => {
  it('updates from a valid event (status + sub-status)', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        latestEvent: {
          status: 'Suivi terminé',
          subStatus: 'Sortie de la vacance'
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'event'
    });
  });

  it('updates from an event whose status needs no sub-status, forcing sub-status null', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        latestEvent: { status: 'En attente de retour', subStatus: 'leftover' }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.WAITING,
      targetSubStatus: null,
      source: 'event'
    });
  });

  it('flags an event with sub-status only (status omitted) for review', () => {
    const result = decide(
      base({ latestEvent: { subStatus: 'Sortie de la vacance' } })
    );
    expect(result).toMatchObject({
      action: 'error',
      reason: 'missing-or-unknown-status'
    });
  });

  it('flags an event with an unknown status label for review', () => {
    const result = decide(base({ latestEvent: { status: 'Bloqué' } }));
    expect(result).toMatchObject({
      action: 'error',
      reason: 'missing-or-unknown-status'
    });
  });

  it('flags an event whose required sub-status is absent or invalid for review', () => {
    const absent = decide(base({ latestEvent: { status: 'Suivi terminé' } }));
    expect(absent).toMatchObject({
      action: 'error',
      reason: 'invalid-sub-status'
    });

    const wrong = decide(
      base({
        latestEvent: { status: 'Suivi terminé', subStatus: 'not-a-real-sub' }
      })
    );
    expect(wrong).toMatchObject({
      action: 'error',
      reason: 'invalid-sub-status'
    });
  });

  it('falls back to NEVER_CONTACTED when no event and housing is in lovac-2026', () => {
    const result = decide(
      base({ latestEvent: null, dataFileYears: ['lovac-2025', 'lovac-2026'] })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.NEVER_CONTACTED,
      targetSubStatus: null,
      source: 'fallback-lovac'
    });
  });

  it('backfills COMPLETED + "Sortie de la vacance" when no event, not in lovac-2026, and already COMPLETED', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        latestEvent: null,
        dataFileYears: ['lovac-2025']
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'fallback-completed'
    });
  });

  it('sends a non-COMPLETED housing with no event (not in lovac-2026) to review, unchanged', () => {
    for (const status of [
      HousingStatus.FIRST_CONTACT,
      HousingStatus.IN_PROGRESS,
      HousingStatus.BLOCKED
    ]) {
      const result = decide(
        base({ status, latestEvent: null, dataFileYears: ['lovac-2025'] })
      );
      expect(result).toMatchObject({
        action: 'review',
        currentStatus: status,
        reason: 'no-event-non-completed'
      });
    }
  });
});
