import { DefaultOption } from './SelectOption';
import { CampaignHousing } from './Housing';

export interface CampaignHousingState {
    status: CampaignHousingStatus;
    title: string,
    steps?: CampaignHousingStep[];
    color: string;
    bgcolor: string;
}

export interface CampaignHousingStep {
    title: string;
    precisions?: CampaignHousingPrecision[];
    color: string;
    bgcolor: string;
}

export interface CampaignHousingPrecision {
    title: string;
    color: string;
    bgcolor: string;
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
        color: '--green-tilleul-verveine-sun-418',
        bgcolor: '--green-tilleul-verveine-975'
    },
    {
        status: CampaignHousingStatus.InProgress,
        title: 'Suivi en cours',
        color: '--purple-glycine-main-494',
        bgcolor: '--purple-glycine-975',
        steps: [
            {
                title: 'À recontacter',
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925'
            },
            {
                title: 'Informations transmises',
                color: '--green-menthe-sun-373',
                bgcolor: '--green-menthe-975',
                precisions: [
                    {
                        title: 'Intéressé',
                        color: '--green-emeraude-975',
                        bgcolor: '--green-archipel-sun-391'
                    },
                    {
                        title: 'Pas intéressé - à recontacter plus tard',
                        color: '--grey-1000',
                        bgcolor: '--green-menthe-850'
                    }
                ]
            },
            {
                title: 'En pré-accompagnement',
                color: '--blue-ecume-sun-247',
                bgcolor: '--blue-ecume-950',
                precisions: [
                    {
                        title: 'Visite technique',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
                    {
                        title: 'Étude faisabilité',
                        color: '--blue-ecume-main-400',
                        bgcolor: '--green-archipel-975'
                    },
                    {
                        title: 'Autre',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247-active'
                    }
                ]
            },
            {
                title: 'En accompagnement',
                color: '--green-tilleul-verveine-sun-418',
                bgcolor: '--green-tilleul-verveine-975',
                precisions: [
                    {
                        title: 'Montage dossier de financement',
                        color: '--pink-macaron-main-689',
                        bgcolor: '--pink-macaron-975'
                    },
                    {
                        title: 'Préparation des travaux',
                        color: '--purple-glycine-975',
                        bgcolor: '--purple-glycine-main-494'
                    },
                    {
                        title: 'En travaux',
                        color: '--pink-tuile-975',
                        bgcolor: '--pink-tuile-main-556'
                    },
                    {
                        title: 'Clôture dossier financement',
                        color: '--brown-caramel-sun-425',
                        bgcolor: '--brown-caramel-975'
                    },
                    {
                        title: 'En vente',
                        color: '--brown-caramel-975',
                        bgcolor: '--yellow-moutarde-sun-348-hover'
                    },
                    {
                        title: 'En recherche de locataire',
                        color: '--brown-caramel-975',
                        bgcolor: '--brown-caramel-sun-425'
                    },
                    {
                        title: 'Autre',
                        color: '--grey-1000',
                        bgcolor: '--beige-gris-galet-moon-821-hover'
                    }
                ]
            },
            {
                title: 'Intervention publique',
                color: '--pink-macaron-sun-406',
                bgcolor: '--pink-macaron-950',
                precisions: [
                    {
                        title: 'ORI - TIRORI',
                        color: '',
                        bgcolor: ''
                    },
                    {
                        title: 'Bien sans maitre',
                        color: '',
                        bgcolor: ''
                    },
                    {
                        title: 'Abandon manifeste',
                        color: '',
                        bgcolor: ''
                    },
                    {
                        title: 'DIA - préemption',
                        color: '',
                        bgcolor: ''
                    },
                    {
                        title: 'Procédure d’habitat indigne',
                        color: '',
                        bgcolor: ''
                    }
                ]
            },
            {
                title: 'En sortie sans accompagnement',
                color: '--brown-opera-sun-395',
                bgcolor: '--brown-opera-950',
                precisions: [
                    {
                        title: 'Vente en cours',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Location en cours',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Rénovation (ou projet) en cours',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--brown-caramel-975'
                    }
                ]
            }
        ]
    },
    {
        status: CampaignHousingStatus.NotVacant,
        title: 'Non-vacant',
        color: '--yellow-tournesol-975',
        bgcolor: '--yellow-moutarde-sun-348-hover',
        steps: [
            {
                title: 'Déclaré non-vacant',
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925'
            },
            {
                title: 'Constaté non-vacant',
                color: '--green-bourgeon-975',
                bgcolor: '--green-bourgeon-sun-425-active'
            }
        ]
    },
    {
        status: CampaignHousingStatus.NoAction,
        title: 'Bloqué',
        color: '--blue-cumulus-975',
        bgcolor: '--blue-cumulus-main-526',
        steps: [
            {
                title: 'NPAI',
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925'
            },
            {
                title: 'Vacance organisée',
                color: '--green-menthe-975',
                bgcolor: '--green-menthe-sun-373'
            },
            {
                title: 'Vacance volontaire ',
                color: '--green-menthe-sun-373',
                bgcolor: '--green-menthe-975',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Autre',
                        color: '--grey-1000',
                        bgcolor: '--green-menthe-850'
                    }
                ]
            },
            {
                title: 'Mauvais état',
                color: '--blue-ecume-sun-247',
                bgcolor: '--blue-ecume-950',
                precisions: [
                    {
                        title: 'Travaux trop importants',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
                    {
                        title: 'Ruine, à démolir',
                        color: '--blue-ecume-main-400',
                        bgcolor: '--green-archipel-975'
                    },
                    {
                        title: 'Autre',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247-active'
                    }
                ]
            },
            {
                title: 'Mauvaise expérience locative',
                color: '--green-tilleul-verveine-sun-418',
                bgcolor: '--green-tilleul-verveine-975',
                precisions: [
                    {
                        title: 'Dégradations',
                        color: '--brown-caramel-975',
                        bgcolor: '--yellow-moutarde-sun-348-hover'
                    },
                    {
                        title: 'Impayés de loyer',
                        color: '--brown-caramel-975',
                        bgcolor: '--brown-caramel-sun-425'
                    },
                    {
                        title: 'Autre',
                        color: '--grey-1000',
                        bgcolor: '--beige-gris-galet-moon-821-hover'
                    }
                ]
            },
            {
                title: 'Blocage juridique',
                color: '--pink-macaron-sun-406',
                bgcolor: '--pink-macaron-950',
                precisions: [
                    {
                        title: 'Succession difficile, indivision en désaccord',
                        color: '--pink-macaron-main-689',
                        bgcolor: '--pink-macaron-975'
                    },
                    {
                        title: 'Expertise judiciaire',
                        color: '--purple-glycine-975',
                        bgcolor: '--purple-glycine-main-494'
                    },
                    {
                        title: 'Procédure contre les entrepreneurs',
                        color: '--pink-tuile-975',
                        bgcolor: '--pink-tuile-main-556'
                    },
                    {
                        title: 'Autre',
                        color: '--blue-ecume-sun-247-active',
                        bgcolor: '--purple-glycine-975'
                    },
                ]
            },
            {
                title: 'Liée au propriétaire',
                color: '--brown-opera-sun-395',
                bgcolor: '--brown-opera-950',
                precisions: [
                    {
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Autre',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--brown-caramel-975'
                    }
                ]
            },
            {
                title: 'Projet qui n\'aboutit pas',
                color: '--blue-ecume-975',
                bgcolor: '--blue-ecume-main-400',
                precisions: [
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    },
                    {
                        title: 'Autre',
                        color: '--grey-1000',
                        bgcolor: '--green-archipel-sun-391-active'
                    }
                ]
            },
            {
                title: 'Rejet formel de l\'accompagnement',
                color: '--blue-ecume-200',
                bgcolor: '--yellow-tournesol-moon-922-active'
            },
        ]
    },
    {
        status: CampaignHousingStatus.Exit,
        title: 'Accompagnement terminé',
        color: '--blue-ecume-sun-247',
        bgcolor: '--blue-ecume-950',
        steps: [
            {
                title: 'Loué',
                color: '--blue-ecume-975',
                bgcolor: '--blue-ecume-sun-247'
            },
            {
                title: 'Vendu',
                color: '--blue-ecume-main-400',
                bgcolor: '--green-archipel-975'
            },
            {
                title: 'Occupation personnelle ou pour un proche',
                color: '--blue-ecume-975',
                bgcolor: '--blue-ecume-sun-247-active'
            }
        ]
    }
]

export const getCampaignHousingState = (status: CampaignHousingStatus) => {
    return CampaignHousingStates[status]
}

export const getStep = (status: CampaignHousingStatus, stepTitle: string): CampaignHousingStep | undefined => {
    return getCampaignHousingState(status).steps?.filter(s => s.title === stepTitle)[0]
}

export const getCampaignHousingStep = (campaignHousing: CampaignHousing): CampaignHousingStep | undefined => {
    if (campaignHousing.step) {
        return getStep(campaignHousing.status, campaignHousing.step)
    }
}

export const getPrecision = (status: CampaignHousingStatus, stepTitle: string, precisionTitle: string): CampaignHousingPrecision | undefined => {
    return getStep(status, stepTitle)?.precisions?.filter(p => p.title === precisionTitle)[0]
}

export const getCampaignHousingPrecision = (campaignHousing: CampaignHousing): CampaignHousingPrecision | undefined => {
    if (campaignHousing.step && campaignHousing.precision) {
        return getPrecision(campaignHousing.status, campaignHousing.step, campaignHousing.precision)
    }
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
