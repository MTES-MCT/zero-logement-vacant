export enum HousingStatusApi {
    NotInCampaign,
    Waiting,
    FirstContact,
    InProgress,
    NotVacant,
    NoAction,
    Exit
}

export const FirstContactWithPreSupportSubStatus = 'En pré-accompagnement'
export const InProgressWithSupportSubStatus = 'En accompagnement'
export const InProgressWithoutSupportSubStatus = 'En sortie sans accompagnement'
export const ExitWithSupportSubStatus = 'Via accompagnement'
export const ExitWithPublicSupportSubStatus = 'Via intervention publique'
export const ExitWithoutSupportSubStatus = 'Sans accompagnement'

