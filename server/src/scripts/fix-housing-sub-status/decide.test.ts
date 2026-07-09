import { HousingStatus } from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import { decide } from './decide';

const STILL_VACANT = ['lovac-2024', 'lovac-2026'];
const EXITED = ['lovac-2019', 'lovac-2022'];
const NEVER_TRACKED = ['ff-2023-locatif', 'ff-2024-locatif'];

function base(overrides = {}) {
  return {
    geoCode: '01001',
    id: 'h1',
    status: HousingStatus.COMPLETED,
    subStatus: null as string | null,
    dataFileYears: NEVER_TRACKED as string[],
    latestEvent: null,
    ...overrides
  };
}

describe('decide — still vacant (in lovac-2026)', () => {
  it('keeps an active CURRENT pair, renaming a legacy sub-status (075face1)', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'NPAI',
        dataFileYears: STILL_VACANT
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      cohort: 'still-vacant',
      targetStatus: HousingStatus.FIRST_CONTACT,
      source: 'keep-active'
    });
    expect(result.action === 'update' && result.targetSubStatus).toMatch(
      /^N.habite pas à l.adresse indiquée$/
    );
  });

  it('keeps an active state from the EVENT when the current pair is not usable (123a492a)', () => {
    const result = decide(
      base({
        status: HousingStatus.WAITING,
        subStatus: 'En sortie sans accompagnement',
        dataFileYears: STILL_VACANT,
        latestEvent: {
          status: 'Suivi en cours',
          subStatus: 'En sortie sans accompagnement'
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.IN_PROGRESS,
      targetSubStatus: 'En sortie sans accompagnement',
      source: 'keep-active'
    });
  });

  it('resets to NEVER_CONTACTED when neither current nor event is active', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        subStatus: null,
        dataFileYears: STILL_VACANT,
        latestEvent: {
          status: 'Suivi terminé',
          subStatus: "N'était pas vacant"
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.NEVER_CONTACTED,
      targetSubStatus: null,
      source: 'lovac-reset'
    });
  });
});

describe('decide — exited (was in a lovac file, not 2026)', () => {
  it('keeps the event’s valid COMPLETED sub-status', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance',
        dataFileYears: EXITED,
        latestEvent: {
          status: 'Suivi terminé',
          subStatus: "N'était pas vacant"
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      source: 'lovac-exit'
    });
    expect(result.action === 'update' && result.targetSubStatus).toMatch(
      /^N.était pas vacant$/
    );
  });

  it('defaults to COMPLETED + "Sortie de la vacance" with no usable COMPLETED event', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        subStatus: null,
        dataFileYears: EXITED,
        latestEvent: null
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'lovac-exit'
    });
  });

  it('overrides an active event to COMPLETED (exited beats active work)', () => {
    const result = decide(
      base({
        status: HousingStatus.IN_PROGRESS,
        subStatus: null,
        dataFileYears: EXITED,
        latestEvent: {
          status: 'Suivi en cours',
          subStatus: 'En accompagnement'
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'lovac-exit'
    });
  });
});

describe('decide — never vacancy-tracked (rental / manual)', () => {
  it('keeps the current pair after a legacy rename', () => {
    const result = decide(
      base({
        status: HousingStatus.BLOCKED,
        subStatus: "Projet qui n'aboutit pas",
        dataFileYears: NEVER_TRACKED
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.BLOCKED,
      targetSubStatus: 'Blocage involontaire du propriétaire',
      source: 'legacy-rename'
    });
  });

  it('restores from a usable event when the current pair is invalid', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance', // cross-status → current not usable
        dataFileYears: NEVER_TRACKED,
        latestEvent: {
          status: 'Suivi en cours',
          subStatus: 'En accompagnement'
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.IN_PROGRESS,
      targetSubStatus: 'En accompagnement',
      source: 'event-restore'
    });
  });

  it('errors on an unknown legacy status label when the current pair is unusable', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance',
        dataFileYears: NEVER_TRACKED,
        latestEvent: { status: 'Accompagnement terminé', subStatus: 'Vendu' }
      })
    );
    expect(result).toMatchObject({
      action: 'error',
      reason: 'unknown-status-label'
    });
  });

  it('errors (sub-status-nulled) when the event status decodes but the sub was nulled', () => {
    const result = decide(
      base({
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'Sortie de la vacance',
        dataFileYears: NEVER_TRACKED,
        latestEvent: { status: 'Suivi en cours', subStatus: null }
      })
    );
    expect(result).toMatchObject({
      action: 'error',
      reason: 'sub-status-nulled'
    });
  });

  it('falls back to COMPLETED / "Sortie de la vacance" when no event and invalid current', () => {
    const result = decide(
      base({
        status: HousingStatus.IN_PROGRESS,
        subStatus: null,
        dataFileYears: NEVER_TRACKED,
        latestEvent: null
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      cohort: 'never-tracked',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'fallback-completed'
    });
  });
});
