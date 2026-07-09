import { HousingStatus } from '@zerologementvacant/models';

import { normalizeEventPair, normalizePair, requiresSubStatus } from './legacy';

const LOVAC_PREFIX = 'lovac-';
const LOVAC_2026 = 'lovac-2026';
const COMPLETED_SUB_STATUS = 'Sortie de la vacance';

export interface EventNextNew {
  status?: string;
  subStatus?: string | null;
}

/**
 * Lovac-year cohort — the primary driver of the repair:
 * - `still-vacant`: in lovac-2026;
 * - `exited`: was in some lovac file but not 2026 (left the vacancy file);
 * - `never-tracked`: never in any lovac file (rental / manual only).
 */
export type Cohort = 'still-vacant' | 'exited' | 'never-tracked';

export interface DecideInput {
  geoCode: string;
  id: string;
  status: HousingStatus;
  subStatus: string | null;
  dataFileYears: ReadonlyArray<string>;
  latestEvent: EventNextNew | null;
}

export type UpdateSource =
  | 'keep-active'
  | 'lovac-reset'
  | 'lovac-exit'
  | 'event-restore'
  | 'legacy-rename'
  | 'fallback-completed';

interface Base {
  geoCode: string;
  id: string;
  currentStatus: HousingStatus;
  currentSubStatus: string | null;
  cohort: Cohort;
}

export type Decision =
  | (Base & {
      action: 'update';
      targetStatus: HousingStatus;
      targetSubStatus: string | null;
      source: UpdateSource;
    })
  | (Base & {
      action: 'error';
      reason: 'unknown-status-label' | 'sub-status-nulled';
    });

/** Active follow-up statuses: require a sub-status but are not terminal COMPLETED. */
function isActiveFollowUp(status: HousingStatus): boolean {
  return requiresSubStatus(status) && status !== HousingStatus.COMPLETED;
}

function cohortOf(dataFileYears: ReadonlyArray<string>): Cohort {
  if (dataFileYears.includes(LOVAC_2026)) {
    return 'still-vacant';
  }
  if (dataFileYears.some((year) => year.startsWith(LOVAC_PREFIX))) {
    return 'exited';
  }
  return 'never-tracked';
}

export function decide(input: DecideInput): Decision {
  const { geoCode, id, status, subStatus, dataFileYears, latestEvent } = input;
  const cohort = cohortOf(dataFileYears);
  const base: Base = {
    geoCode,
    id,
    currentStatus: status,
    currentSubStatus: subStatus,
    cohort
  };

  // Both the current pair and the latest event are normalised through the 073
  // legacy maps before we decide.
  const current = normalizePair(status, subStatus);
  const event = latestEvent
    ? normalizeEventPair(latestEvent.status, latestEvent.subStatus)
    : null;

  const update = (
    targetStatus: HousingStatus,
    targetSubStatus: string | null,
    source: UpdateSource
  ): Decision => ({
    ...base,
    action: 'update',
    targetStatus,
    targetSubStatus,
    source
  });

  // Still vacant → reset for a fresh campaign, unless actively worked (keep it).
  if (cohort === 'still-vacant') {
    if (current.ok && isActiveFollowUp(current.status)) {
      return update(current.status, current.subStatus, 'keep-active');
    }
    if (event?.ok && isActiveFollowUp(event.status)) {
      return update(event.status, event.subStatus, 'keep-active');
    }
    return update(HousingStatus.NEVER_CONTACTED, null, 'lovac-reset');
  }

  // Exited the vacancy file → Suivi terminé, keeping the event's own COMPLETED
  // sub-status when it has a valid one, else the default "Sortie de la vacance".
  if (cohort === 'exited') {
    if (event?.ok && event.status === HousingStatus.COMPLETED) {
      return update(event.status, event.subStatus, 'lovac-exit');
    }
    return update(HousingStatus.COMPLETED, COMPLETED_SUB_STATUS, 'lovac-exit');
  }

  // Never vacancy-tracked → lovac rules do not apply.
  // - the current pair becomes valid after a legacy rename → keep it;
  // - else restore from a usable event;
  // - else the event is unusable (log) or there is nothing to go on (review).
  if (current.ok) {
    return update(current.status, current.subStatus, 'legacy-rename');
  }
  if (event?.ok) {
    return update(event.status, event.subStatus, 'event-restore');
  }
  if (event && !event.ok) {
    return {
      ...base,
      action: 'error',
      reason:
        event.reason === 'unknown-status-label'
          ? 'unknown-status-label'
          : 'sub-status-nulled'
    };
  }
  // No event and nothing to go on → assume the follow-up ended in exit.
  return update(
    HousingStatus.COMPLETED,
    COMPLETED_SUB_STATUS,
    'fallback-completed'
  );
}
