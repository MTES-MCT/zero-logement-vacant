import { HousingStatus, Occupancy } from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import { decide } from './decide';

const STILL_VACANT = ['lovac-2024', 'lovac-2026'];
const EXITED_2025 = ['lovac-2024', 'lovac-2025'];
const EXITED_OLD = ['lovac-2019', 'lovac-2022'];
const NEVER_TRACKED = ['ff-2023-locatif', 'ff-2024-locatif'];

function base(overrides = {}) {
  return {
    geoCode: '01001',
    id: 'h1',
    status: HousingStatus.COMPLETED,
    subStatus: null as string | null,
    occupancy: Occupancy.UNKNOWN as string,
    dataFileYears: NEVER_TRACKED as string[],
    latestEvent: null,
    ...overrides
  };
}

describe('decide — still vacant (in lovac-2026)', () => {
  it('keeps an active CURRENT pair, renaming a legacy sub-status', () => {
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
      source: 'keep-active',
      exit: false
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
      source: 'lovac-reset',
      exit: false
    });
  });
});

describe('decide — exited (was in a lovac file, not 2026)', () => {
  it('restores from the latest valid event, even an active one (69149)', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance',
        occupancy: Occupancy.VACANT,
        dataFileYears: EXITED_2025,
        latestEvent: {
          status: 'Suivi en cours',
          subStatus: 'Intervention publique'
        }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.IN_PROGRESS,
      targetSubStatus: 'Intervention publique',
      source: 'event-restore',
      exit: false
    });
  });

  it('exits a VACANT housing that left between lovac-2025 and 2026, with events (69383)', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        dataFileYears: EXITED_2025,
        latestEvent: null
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'lovac-exit',
      exit: true
    });
  });

  it('does not exit an older leaver — completed-fallback, no event (f20830de)', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance',
        occupancy: Occupancy.VACANT,
        dataFileYears: EXITED_OLD,
        latestEvent: null
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Sortie de la vacance',
      source: 'completed-fallback',
      exit: false
    });
  });

  it('does not exit a non-vacant leaver — completed-fallback, no event', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance',
        occupancy: Occupancy.UNKNOWN,
        dataFileYears: EXITED_2025,
        latestEvent: null
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      source: 'completed-fallback',
      exit: false
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
      source: 'legacy-rename',
      exit: false
    });
  });

  it('restores from a usable event when the current pair is invalid', () => {
    const result = decide(
      base({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'Sortie de la vacance',
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

  it('adopts a sub-status-only event with a valid sub, keeping the status (73023)', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        subStatus: null,
        dataFileYears: NEVER_TRACKED,
        latestEvent: { subStatus: 'Autre objectif rempli' }
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: 'Autre objectif rempli',
      source: 'event-sub-adopt',
      exit: false,
      deleteEventId: null
    });
  });

  it('reverts to the event’s old sub and deletes the bug event (77257 / 84054)', () => {
    const result = decide(
      base({
        status: HousingStatus.COMPLETED,
        subStatus: null,
        dataFileYears: NEVER_TRACKED,
        latestEvent: { subStatus: null },
        latestEventOld: {
          status: 'Suivi terminé',
          subStatus: 'Sortie de la vacance'
        },
        latestEventId: 'bug-event-1'
      })
    );
    expect(result).toMatchObject({
      action: 'update',
      targetSubStatus: 'Sortie de la vacance',
      source: 'event-revert',
      exit: false,
      deleteEventId: 'bug-event-1'
    });
  });

  it('falls back to NEVER_CONTACTED when no event and invalid current', () => {
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
      targetStatus: HousingStatus.NEVER_CONTACTED,
      source: 'fallback-never-contacted',
      exit: false
    });
  });
});
