export enum HousingStatus {
  NEVER_CONTACTED,
  WAITING,
  FIRST_CONTACT,
  IN_PROGRESS,
  COMPLETED,
  BLOCKED
}

export const HOUSING_STATUSES: HousingStatus[] = Object.values(
  HousingStatus
).filter((status): status is HousingStatus => typeof status !== 'string');
