import { HousingStatus } from '@zerologementvacant/models';

export enum HousingStatusApi {
  NeverContacted,
  Waiting,
  FirstContact,
  InProgress,
  Completed,
  Blocked
}

export function fromHousingStatus(status: HousingStatus): HousingStatusApi {
  return status as unknown as HousingStatusApi;
}

export function toHousingStatus(status: HousingStatusApi): HousingStatus {
  return status as unknown as HousingStatus;
}

export const HOUSING_STATUS_VALUES = Object.values(HousingStatusApi).filter(
  (value): value is HousingStatusApi => typeof value === 'number'
);

export function getHousingStatusLabel(status: HousingStatus): string | null {
  switch (status) {
    case HousingStatus.NEVER_CONTACTED:
      return 'Non suivi';
    case HousingStatus.WAITING:
      return 'En attente de retour';
    case HousingStatus.FIRST_CONTACT:
      return 'Premier contact';
    case HousingStatus.IN_PROGRESS:
      return 'Suivi en cours';
    case HousingStatus.COMPLETED:
      return 'Suivi terminé';
    case HousingStatus.BLOCKED:
      return 'Bloqué';
  }
}
