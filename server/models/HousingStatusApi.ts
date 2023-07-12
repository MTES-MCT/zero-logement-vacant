export enum HousingStatusApi {
  NeverContacted,
  Waiting,
  FirstContact,
  InProgress,
  Completed,
  Blocked,
}

export const getHousingStatusApiLabel = (
  housingStatusApi?: HousingStatusApi
) => {
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
    default:
      return '';
  }
};

export interface HousingStatusCountApi {
  status: HousingStatusApi;
  subStatus?: string;
  precisions?: string[];
  count: number;
}

export interface HousingStatusDurationApi {
  status: HousingStatusApi;
  averageDuration: any;
  unchangedFor3MonthsCount: number;
}

export const FirstContactWithPreSupportSubStatus = 'En pré-accompagnement';
export const InProgressWithSupportSubStatus = 'En accompagnement';
export const InProgressWithPublicSupportSubStatus = 'Intervention publique';
export const InProgressWithoutSupportSubStatus =
  'En sortie sans accompagnement';
export const ExitWithSupportSubStatus = 'Via accompagnement';
export const ExitWithPublicSupportSubStatus = 'Via intervention publique';
export const ExitWithoutSupportSubStatus = 'Sans accompagnement';
