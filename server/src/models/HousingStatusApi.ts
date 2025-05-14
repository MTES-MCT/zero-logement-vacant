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

export function getHousingStatusApiLabel(
  housingStatusApi: HousingStatusApi
): string | null {
  switch (housingStatusApi) {
    case HousingStatusApi.NeverContacted:
      return 'Non suivi';
    case HousingStatusApi.Waiting:
      return 'En attente de retour';
    case HousingStatusApi.FirstContact:
      return 'Premier contact';
    case HousingStatusApi.InProgress:
      return 'Suivi en cours';
    case HousingStatusApi.Completed:
      return 'Suivi terminé';
    case HousingStatusApi.Blocked:
      return 'Bloqué';
  }
}
