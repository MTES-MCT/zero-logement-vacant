import { HousingStatus } from '@zerologementvacant/models';

import {
  normalizeEventPair,
  normalizePair,
  requiresSubStatus,
  type Normalized
} from './legacy';

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
      // `apply` writes an admin status-updated event when true, and deletes
      // `deleteEventId` when set.
      writeEvent: boolean;
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

  // Does the latest event already record this exact target? Then `apply` only
  // syncs the row — no new event.
  const matchesEvent = (
    targetStatus: HousingStatus,
    targetSubStatus: string | null
  ): boolean =>
    !!event &&
    event.ok &&
    event.status === targetStatus &&
    event.subStatus === targetSubStatus;

  const update = (
    targetStatus: HousingStatus,
    targetSubStatus: string | null,
    source: UpdateSource,
    events?: { writeEvent?: boolean; deleteEventId?: string | null }
  ): Decision => ({
    ...base,
    action: 'update',
    targetStatus,
    targetSubStatus,
    source,
    writeEvent:
      events?.writeEvent ?? !matchesEvent(targetStatus, targetSubStatus),
    deleteEventId: events?.deleteEventId ?? null
  });

  // Still vacant → reset unless actively worked (keep it).
  if (cohort === 'still-vacant') {
    if (current.ok && isActiveFollowUp(current.status)) {
      return update(current.status, current.subStatus, 'keep-active');
    }
    if (event?.ok && isActiveFollowUp(event.status)) {
      return update(event.status, event.subStatus, 'keep-active');
    }
    return update(HousingStatus.NEVER_CONTACTED, null, 'lovac-reset');
  }

  // Exited → COMPLETED, keeping the event's own valid COMPLETED sub-status.
  if (cohort === 'exited') {
    if (event?.ok && event.status === HousingStatus.COMPLETED) {
      return update(event.status, event.subStatus, 'lovac-exit');
    }
    return update(HousingStatus.COMPLETED, COMPLETED_SUB_STATUS, 'lovac-exit');
  }

  // Never vacancy-tracked.
  if (current.ok) {
    return update(current.status, current.subStatus, 'legacy-rename');
  }
  if (event?.ok) {
    return update(event.status, event.subStatus, 'event-restore');
  }

  // The event is not directly usable — try to recover from it before erroring.
  if (latestEvent && event) {
    // The latest event only changed the sub-status (no status field). If its new
    // sub-status is valid for the current status, adopt it and keep the event.
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
        return update(adopted.status, adopted.subStatus, 'event-sub-adopt', {
          writeEvent: false
        });
      }
    }
    // The latest event nulled a previously-valid sub-status (the bulk bug):
    // revert to the event's `next_old` sub-status and delete the bug event.
    if (latestEventOld && latestEventId) {
      const reverted = normalizePair(status, latestEventOld.subStatus ?? null);
      if (
        reverted.ok &&
        reverted.status === status &&
        reverted.subStatus !== null
      ) {
        return update(reverted.status, reverted.subStatus, 'event-revert', {
          writeEvent: false,
          deleteEventId: latestEventId
        });
      }
    }
    return { ...base, action: 'error', reason: errorReason(event) };
  }

  // No event and nothing to go on → NEVER_CONTACTED.
  return update(
    HousingStatus.NEVER_CONTACTED,
    null,
    'fallback-never-contacted'
  );
}
