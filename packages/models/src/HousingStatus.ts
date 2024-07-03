export enum HousingStatus {
  NEVER_CONTACTED,
  WAITING,
  FIRST_CONTACT,
  IN_PROGRESS,
  COMPLETED,
  BLOCKED
}

export const HOUSING_STATUS_VALUES: HousingStatus[] = Object.values(
  HousingStatus
).filter((status): status is HousingStatus => typeof status !== 'string');

export function isHousingStatus(value: number): value is HousingStatus {
  return HOUSING_STATUS_VALUES.includes(value);
}
