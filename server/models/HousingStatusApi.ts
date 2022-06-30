export enum HousingStatusApi {
    NotInCampaign,
    Waiting,
    FirstContact,
    InProgress,
    NotVacant,
    NoAction,
    Exit
}

export interface HousingStatusCountApi {
    status: HousingStatusApi,
    subStatus?: string,
    precisions?: string[],
    count: number
}

export interface HousingStatusDurationApi {
    status: HousingStatusApi,
    averageDuration: any,
    unchangedFor3MonthsCount: number
}

export const FirstContactWithPreSupportSubStatus = 'En pré-accompagnement'
export const InProgressWithSupportSubStatus = 'En accompagnement'
export const InProgressWithPublicSupportSubStatus = 'Intervention publique'
export const InProgressWithoutSupportSubStatus = 'En sortie sans accompagnement'
export const ExitWithSupportSubStatus = 'Via accompagnement'
export const ExitWithPublicSupportSubStatus = 'Via intervention publique'
export const ExitWithoutSupportSubStatus = 'Sans accompagnement'

