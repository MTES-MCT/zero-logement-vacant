import { DefaultOption } from './SelectOption';
import { Housing } from './Housing';

export interface HousingState {
    status: HousingStatus;
    title: string,
    subStatusList?: HousingSubStatus[];
    color?: string;
    bgcolor?: string;
}

export interface HousingSubStatus {
    title: string;
    precisions?: HousingStatusPrecision[];
    color: string;
    bgcolor: string;
}

export interface HousingStatusPrecision {
    title: string;
    color: string;
    bgcolor: string;
}

export enum HousingStatus {
    NotInCampaign,
    Waiting,
    InProgress,
    NotVacant,
    NoAction,
    Exit
}

export const HousingStates: HousingState[] = [
    {
        status: HousingStatus.NotInCampaign,
        title: 'Pas dans une campagne'
    },
    {
        status: HousingStatus.Waiting,
        title: 'En attente de retour',
        color: '--green-tilleul-verveine-sun-418',
        bgcolor: '--green-tilleul-verveine-975'
    },
    {
        status: HousingStatus.InProgress,
        title: 'Suivi en cours',
        color: '--purple-glycine-main-494',
        bgcolor: '--purple-glycine-975',
        subStatusList: [
            {
                title: 'À recontacter',
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925',
                precisions: [
                    {
                        title: 'Informations transmises - Encore à convaincre',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
                    {
                        title: 'Mauvais moment',
                        color: '--blue-ecume-main-400',
                        bgcolor: '--green-archipel-975'
                    },
                    {
                        title: 'Recherche autre interlocuteur',
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
                        title: 'Informations transmises - rendez-vous à fixer',
                        color: '--grey-1000',
                        bgcolor: '--green-menthe-850'
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
        status: HousingStatus.NotVacant,
        title: 'Non-vacant',
        color: '--yellow-tournesol-975',
        bgcolor: '--yellow-moutarde-sun-348-hover',
        subStatusList: [
            {
                title: 'Déclaré non-vacant',
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925',
                precisions: [
                    {
                        title: 'Occupé par le propriétaire',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247-active'
                    },
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
                        title: 'Cause inconnue',
                        color: '--blue-ecume-sun-247-active',
                        bgcolor: '--purple-glycine-975'
                    }
                ]
            },
            {
                title: 'Constaté non-vacant',
                color: '--green-bourgeon-975',
                bgcolor: '--green-bourgeon-sun-425-active',
                precisions: [
                    {
                        title: 'Occupé par le propriétaire',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247-active'
                    },
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
                        title: 'Cause inconnue',
                        color: '--blue-ecume-sun-247-active',
                        bgcolor: '--purple-glycine-975'
                    }
                ]
            }
        ]
    },
    {
        status: HousingStatus.NoAction,
        title: 'Bloqué',
        color: '--blue-cumulus-975',
        bgcolor: '--blue-cumulus-main-526',
        subStatusList: [
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
        status: HousingStatus.Exit,
        title: 'Accompagnement terminé',
        color: '--blue-ecume-sun-247',
        bgcolor: '--blue-ecume-950',
        subStatusList: [
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

export const getHousingState = (status: HousingStatus) => {
    return HousingStates[status]
}

export const getSubStatus = (status: HousingStatus, subStatusTitle: string): HousingSubStatus | undefined => {
    return getHousingState(status).subStatusList?.filter(s => s.title === subStatusTitle)[0]
}

export const getHousingSubStatus = (housing: Housing): HousingSubStatus | undefined => {
    if (housing.status && housing.subStatus) {
        return getSubStatus(housing.status, housing.subStatus)
    }
}

export const getPrecision = (status: HousingStatus, subStatusTitle: string, precisionTitle: string): HousingStatusPrecision | undefined => {
    return getSubStatus(status, subStatusTitle)?.precisions?.filter(p => p.title === precisionTitle)[0]
}

export const getHousingStatusPrecision = (housing: Housing): HousingStatusPrecision | undefined => {
    if (housing.status && housing.subStatus && housing.precision) {
        return getPrecision(housing.status, housing.subStatus, housing.precision)
    }
}

export const getSubStatusOptions = (status: HousingStatus) => {
    const housingState = getHousingState(status)
    return housingState.subStatusList ? [
        DefaultOption,
        ...housingState.subStatusList.map(subStatus => ({value: subStatus.title, label: subStatus.title}))
    ] : undefined;
}

export const getStatusPrecisionOptions = (status: HousingStatus, subStatus?: string) => {
    const housingSubStatus = getHousingState(status).subStatusList?.find(s => s.title === subStatus)
    return housingSubStatus?.precisions ? [
        DefaultOption,
        ...housingSubStatus.precisions.map(subStatus => ({value: subStatus.title, label: subStatus.title}))
    ] : undefined;
}
