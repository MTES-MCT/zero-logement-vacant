import {
  getSubStatuses,
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  HousingStatus
} from '@zerologementvacant/models';

const LOVAC_2026 = 'lovac-2026';
const COMPLETED_SUB_STATUS = 'Sortie de la vacance';

const STATUSES_REQUIRING_SUB_STATUS: ReadonlyArray<HousingStatus> = [
  HousingStatus.FIRST_CONTACT,
  HousingStatus.IN_PROGRESS,
  HousingStatus.COMPLETED,
  HousingStatus.BLOCKED
];

export function requiresSubStatus(status: HousingStatus): boolean {
  return STATUSES_REQUIRING_SUB_STATUS.includes(status);
}

const LABEL_TO_STATUS: ReadonlyMap<string, HousingStatus> = new Map(
  HOUSING_STATUS_VALUES.map((status) => [HOUSING_STATUS_LABELS[status], status])
);

export function decodeStatusLabel(
  label: string | undefined
): HousingStatus | undefined {
  if (label === undefined) {
    return undefined;
  }
  return LABEL_TO_STATUS.get(label);
}

export interface EventNextNew {
  status?: string;
  subStatus?: string | null;
}

export interface DecideInput {
  geoCode: string;
  id: string;
  status: HousingStatus;
  dataFileYears: ReadonlyArray<string>;
  latestEvent: EventNextNew | null;
}

export type Decision =
  | {
      action: 'update';
      geoCode: string;
      id: string;
      currentStatus: HousingStatus;
      targetStatus: HousingStatus;
      targetSubStatus: string | null;
      source: 'event' | 'fallback-lovac' | 'fallback-completed';
    }
  | {
      action: 'error';
      geoCode: string;
      id: string;
      currentStatus: HousingStatus;
      reason: 'missing-or-unknown-status' | 'invalid-sub-status';
      nextNew: EventNextNew | null;
    }
  | {
      // No event history and not in lovac-2026: no basis to change the status,
      // so leave the housing as-is and log it for a product decision.
      action: 'review';
      geoCode: string;
      id: string;
      currentStatus: HousingStatus;
      reason: 'no-event-non-completed';
    };

type ResolvedEvent =
  | { valid: true; status: HousingStatus; subStatus: string | null }
  | {
      valid: false;
      reason: 'missing-or-unknown-status' | 'invalid-sub-status';
    };

/**
 * Decode an event's `next_new` into a valid `(status, subStatus)` target, or
 * the reason it cannot be used.
 */
function resolveEvent(event: EventNextNew): ResolvedEvent {
  const status = decodeStatusLabel(event.status);
  if (status === undefined) {
    return { valid: false, reason: 'missing-or-unknown-status' };
  }
  const subStatus = event.subStatus ?? null;
  if (requiresSubStatus(status)) {
    if (subStatus === null || !getSubStatuses(status).has(subStatus)) {
      return { valid: false, reason: 'invalid-sub-status' };
    }
    return { valid: true, status, subStatus };
  }
  return { valid: true, status, subStatus: null };
}

/**
 * Active follow-up statuses: they require a sub-status but are not the terminal
 * COMPLETED (exited) status.
 */
function isActiveFollowUp(status: HousingStatus): boolean {
  return requiresSubStatus(status) && status !== HousingStatus.COMPLETED;
}

export function decide(input: DecideInput): Decision {
  const {
    geoCode,
    id,
    status: currentStatus,
    dataFileYears,
    latestEvent
  } = input;

  // Still vacant in the latest data (lovac-2026): a follow-up event that says
  // the housing exited is contradicted. Keep only a valid ACTIVE event;
  // otherwise reset to NEVER_CONTACTED — this also rescues housings whose latest
  // event was corrupted by the sub-status-nulling bug.
  if (dataFileYears.includes(LOVAC_2026)) {
    if (latestEvent !== null) {
      const resolved = resolveEvent(latestEvent);
      if (resolved.valid && isActiveFollowUp(resolved.status)) {
        return {
          action: 'update',
          geoCode,
          id,
          currentStatus,
          targetStatus: resolved.status,
          targetSubStatus: resolved.subStatus,
          source: 'event'
        };
      }
    }
    return {
      action: 'update',
      geoCode,
      id,
      currentStatus,
      targetStatus: HousingStatus.NEVER_CONTACTED,
      targetSubStatus: null,
      source: 'fallback-lovac'
    };
  }

  // Not in lovac-2026 (left the file): trust the latest event.
  if (latestEvent !== null) {
    const resolved = resolveEvent(latestEvent);
    if (!resolved.valid) {
      return {
        action: 'error',
        geoCode,
        id,
        currentStatus,
        reason: resolved.reason,
        nextNew: latestEvent
      };
    }
    return {
      action: 'update',
      geoCode,
      id,
      currentStatus,
      targetStatus: resolved.status,
      targetSubStatus: resolved.subStatus,
      source: 'event'
    };
  }

  // No event, not in lovac-2026:
  // - already COMPLETED → backfill the default sub-status
  // - otherwise → no basis to rewrite the status; leave as-is for product review
  if (currentStatus === HousingStatus.COMPLETED) {
    return {
      action: 'update',
      geoCode,
      id,
      currentStatus,
      targetStatus: HousingStatus.COMPLETED,
      targetSubStatus: COMPLETED_SUB_STATUS,
      source: 'fallback-completed'
    };
  }

  return {
    action: 'review',
    geoCode,
    id,
    currentStatus,
    reason: 'no-event-non-completed'
  };
}
