import { DefaultOption } from './SelectOption';

export interface CampaignHousingState {
    status: CampaignHousingStatus;
    title: string,
    steps?: CampaignHousingStep[];
}

export interface CampaignHousingStep {
    title: string;
    precisions?: CampaignHousingPrecision[]
}

export interface CampaignHousingPrecision {
    title: string
}

export enum CampaignHousingStatus {
    Waiting,
    InProgress,
    NotVacant,
    NoAction,
    Exit
}

export const CampaignHousingStates: CampaignHousingState[] = [
    {
        status: CampaignHousingStatus.Waiting,
        title: 'En attente de retour',
    },
    {
        status: CampaignHousingStatus.InProgress,
        title: 'Suivi en cours',
        steps: [
            {
                title: 'À recontacter'
            },
            {
                title: 'Informations transmises',
                precisions: [
                    { title: 'Intéressé'},
                    { title: 'Pas intéressé - à recontacter plus tard'}
                ]
            },
            {
                title: 'En pré-accompagnement',
                precisions: [
                    { title: 'Visite technique'},
                    { title: 'Étude faisabilité'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'En accompagnement',
                precisions: [
                    { title: 'Montage dossier de financement'},
                    { title: 'Préparation des travaux'},
                    { title: 'En travaux'},
                    { title: 'Clôture dossier financement'},
                    { title: 'En vente'},
                    { title: 'En recherche de locataire'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'Intervention publique'
            },
            {
                title: 'En sortie sans accompagnement',
                precisions: [
                    { title: 'Vente en cours'},
                    { title: 'Location en cours'},
                    { title: 'Rénovation (ou projet) en cours'}
                ]
            }
        ]
    },
    {
        status: CampaignHousingStatus.NotVacant,
        title: 'Non-vacant',
        steps: [
            {
                title: 'Déclaré non-vacant'
            },
            {
                title: 'Constaté non-vacant'
            }
        ]
    },
    {
        status: CampaignHousingStatus.NoAction,
        title: 'Sans suite',
        steps: [
            {
                title: 'NPAI'
            },
            {
                title: 'Vacance organisée'
            },
            {
                title: 'Vacance volontaire ',
                precisions: [
                    { title: 'Réserve personnelle ou pour une autre personne'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'Mauvais état',
                precisions: [
                    { title: 'Travaux trop importants'},
                    { title: 'Ruine, à démolir'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'Mauvaise expérience locative',
                precisions: [
                    { title: 'Dégradations'},
                    { title: 'Impayés de loyer'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'Blocage juridique',
                precisions: [
                    { title: 'Succession difficile, indivision en désaccord'},
                    { title: 'Expertise judiciaire'},
                    { title: 'Procédure contre les entrepreneurs'},
                    { title: 'Autre'},
                ]
            },
            {
                title: 'Liée au propriétaire',
                precisions: [
                    { title: 'Âge du propriétaire'},
                    { title: 'Difficultés de gestion'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'Projet qui n\'aboutit pas',
                precisions: [
                    { title: 'Ne répond pas aux critères du marché (prix...)'},
                    { title: 'Aides non accordées'},
                    { title: 'Autre'}
                ]
            },
            {
                title: 'Rejet formel de l\'accompagnement'
            },
        ]
    },
    {
        status: CampaignHousingStatus.Exit,
        title: 'Sortie de la vacance',
        steps: [
            {
                title: 'Sortie de la vacance',
                precisions: [
                    { title: 'Loué'},
                    { title: 'Vendu'},
                    { title: 'Occupation personnelle ou pour un proche'}
                ]
            }
        ]
    }
]

export const getCampaignHousingState = (status: CampaignHousingStatus) => {
    return CampaignHousingStates[status]
}

export const getStepOptions = (status: CampaignHousingStatus) => {
    const campaignHousingState = getCampaignHousingState(status)
    return campaignHousingState.steps ? [
        DefaultOption,
        ...campaignHousingState.steps.map(step => ({value: step.title, label: step.title}))
    ] : undefined;
}

export const getPrecisionOptions = (status: CampaignHousingStatus, step?: string) => {
    const campaignHousingStep = getCampaignHousingState(status).steps?.find(s => s.title === step)
    return campaignHousingStep?.precisions ? [
        DefaultOption,
        ...campaignHousingStep.precisions.map(step => ({value: step.title, label: step.title}))
    ] : undefined;
}
