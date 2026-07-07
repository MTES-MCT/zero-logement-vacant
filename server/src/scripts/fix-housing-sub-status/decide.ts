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
    };

export function decide(input: DecideInput): Decision {
  const {
    geoCode,
    id,
    status: currentStatus,
    dataFileYears,
    latestEvent
  } = input;

  if (latestEvent !== null) {
    const targetStatus = decodeStatusLabel(latestEvent.status);
    if (targetStatus === undefined) {
      return {
        action: 'error',
        geoCode,
        id,
        currentStatus,
        reason: 'missing-or-unknown-status',
        nextNew: latestEvent
      };
    }

    const subStatus = latestEvent.subStatus ?? null;
    if (requiresSubStatus(targetStatus)) {
      if (subStatus === null || !getSubStatuses(targetStatus).has(subStatus)) {
        return {
          action: 'error',
          geoCode,
          id,
          currentStatus,
          reason: 'invalid-sub-status',
          nextNew: latestEvent
        };
      }
    }

    return {
      action: 'update',
      geoCode,
      id,
      currentStatus,
      targetStatus,
      targetSubStatus: requiresSubStatus(targetStatus) ? subStatus : null,
      source: 'event'
    };
  }

  if (dataFileYears.includes(LOVAC_2026)) {
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
