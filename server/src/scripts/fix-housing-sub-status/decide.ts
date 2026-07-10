import { HousingStatus, Occupancy } from '@zerologementvacant/models';

import {
  normalizeEventPair,
  normalizePair,
  requiresSubStatus,
  type Normalized
} from './legacy';

const LOVAC_PREFIX = 'lovac-';
const LOVAC_2025 = 'lovac-2025';
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
  occupancy: string;
  dataFileYears: ReadonlyArray<string>;
  /** `next_new` of the latest `housing:status-updated` event. */
  latestEvent: EventNextNew | null;
  /** `next_old` of that event (needed to revert the sub-status-nulling bug). */
  latestEventOld?: EventNextNew | null;
  /** id of that event (needed to delete it). */
  latestEventId?: string | null;
}

export type UpdateSource =
  | 'keep-active'
  | 'lovac-reset'
  | 'lovac-exit'
  | 'completed-fallback'
  | 'event-restore'
  | 'legacy-rename'
  | 'fallback-never-contacted'
  | 'event-sub-adopt'
  | 'event-revert';

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
      // `exit` mirrors the LOVAC import's exit: on apply, occupancy → UNKNOWN
      // and both a status-updated and an occupancy-updated event are written.
      exit: boolean;
      // An event `apply` must delete (the sub-status-nulling bug event).
      deleteEventId: string | null;
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

function errorReason(
  event: Normalized & { ok: false }
): 'unknown-status-label' | 'sub-status-nulled' {
  return event.reason === 'unknown-status-label'
    ? 'unknown-status-label'
    : 'sub-status-nulled';
}

export function decide(input: DecideInput): Decision {
  const {
    geoCode,
    id,
    status,
    subStatus,
    occupancy,
    dataFileYears,
    latestEvent,
    latestEventOld,
    latestEventId
  } = input;
  const cohort = cohortOf(dataFileYears);
  const base: Base = {
    geoCode,
    id,
    currentStatus: status,
    currentSubStatus: subStatus,
    cohort
  };

  const current = normalizePair(status, subStatus);
  const event = latestEvent
    ? normalizeEventPair(latestEvent.status, latestEvent.subStatus)
    : null;

  const update = (
    targetStatus: HousingStatus,
    targetSubStatus: string | null,
    source: UpdateSource,
    events?: { exit?: boolean; deleteEventId?: string | null }
  ): Decision => ({
    ...base,
    action: 'update',
    targetStatus,
    targetSubStatus,
    source,
    exit: events?.exit ?? false,
    deleteEventId: events?.deleteEventId ?? null
  });

  // Still vacant → reset unless actively worked (keep it). No events.
  if (cohort === 'still-vacant') {
    if (current.ok && isActiveFollowUp(current.status)) {
      return update(current.status, current.subStatus, 'keep-active');
    }
    if (event?.ok && isActiveFollowUp(event.status)) {
      return update(event.status, event.subStatus, 'keep-active');
    }
    return update(HousingStatus.NEVER_CONTACTED, null, 'lovac-reset');
  }

  // Exited the vacancy file — mirror the LOVAC import's existing-housing exit.
  if (cohort === 'exited') {
    // 1. The latest event is the source of truth → restore it (no event).
    if (event?.ok) {
      return update(event.status, event.subStatus, 'event-restore');
    }
    // 2. No usable event, still vacant, left between lovac-2025 and 2026 → the
    //    import should have exited it: occupancy → UNKNOWN, Suivi terminé /
    //    Sortie de la vacance, with a status- and an occupancy-updated event.
    if (occupancy === Occupancy.VACANT && dataFileYears.includes(LOVAC_2025)) {
      return update(
        HousingStatus.COMPLETED,
        COMPLETED_SUB_STATUS,
        'lovac-exit',
        {
          exit: true
        }
      );
    }
    // 3. Older exit or no longer vacant → just set the terminal state, no event.
    return update(
      HousingStatus.COMPLETED,
      COMPLETED_SUB_STATUS,
      'completed-fallback'
    );
  }

  // Never vacancy-tracked. No events.
  if (current.ok) {
    return update(current.status, current.subStatus, 'legacy-rename');
  }
  if (event?.ok) {
    return update(event.status, event.subStatus, 'event-restore');
  }
  if (latestEvent && event) {
    const statusAbsent =
      latestEvent.status === undefined || latestEvent.status === null;
    const eventSub = latestEvent.subStatus;
    if (statusAbsent && eventSub !== undefined && eventSub !== null) {
      const adopted = normalizePair(status, eventSub);
      if (
        adopted.ok &&
        adopted.status === status &&
        adopted.subStatus !== null
      ) {
        return update(adopted.status, adopted.subStatus, 'event-sub-adopt');
      }
    }
    if (latestEventOld && latestEventId) {
      const reverted = normalizePair(status, latestEventOld.subStatus ?? null);
      if (
        reverted.ok &&
        reverted.status === status &&
        reverted.subStatus !== null
      ) {
        return update(reverted.status, reverted.subStatus, 'event-revert', {
          deleteEventId: latestEventId
        });
      }
    }
    return { ...base, action: 'error', reason: errorReason(event) };
  }
  return update(
    HousingStatus.NEVER_CONTACTED,
    null,
    'fallback-never-contacted'
  );
}
