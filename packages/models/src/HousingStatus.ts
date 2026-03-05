export enum HousingStatus {
  NEVER_CONTACTED,
  WAITING,
  FIRST_CONTACT,
  IN_PROGRESS,
  COMPLETED,
  BLOCKED
}

/**
 * A value for the transition to remove the enum `HousingStatus`.
 */
export const HOUSING_STATUS_IDS = [
  'never-contacted',
  'waiting',
  'first-contact',
  'in-progress',
  'completed',
  'blocked'
] as const;
export type HousingStatusId = (typeof HOUSING_STATUS_IDS)[number];

export function toHousingStatusId(status: HousingStatus): HousingStatusId {
  return HOUSING_STATUS_IDS[status];
};

export const HOUSING_STATUS_VALUES: HousingStatus[] = Object.values(
  HousingStatus
).filter((status): status is HousingStatus => typeof status !== 'string');

export function isHousingStatus(value: number): value is HousingStatus {
  return HOUSING_STATUS_VALUES.includes(value);
}

export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  [HousingStatus.NEVER_CONTACTED]: 'Non suivi',
  [HousingStatus.WAITING]: 'En attente de retour',
  [HousingStatus.FIRST_CONTACT]: 'Premier contact',
  [HousingStatus.IN_PROGRESS]: 'Suivi en cours',
  [HousingStatus.COMPLETED]: 'Suivi terminé',
  [HousingStatus.BLOCKED]: 'Suivi bloqué'
};
