import { DefaultOption, SelectOption } from './SelectOption';
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

export interface HousingStatusCount {
    status: HousingStatus,
    subStatus?: string,
    precisions?: string[],
    count: number
}

export interface HousingStatusDuration {
    status: HousingStatus,
    averageDuration: any,
    unchangedFor3MonthsCount: number
}

export enum HousingStatus {
    NotInCampaign,
    Waiting,
    FirstContact,
    InProgress,
    NotVacant,
    NoAction,
    Exit
}

export const FirstContactToContactedSubStatus = 'Intérêt potentiel'
export const FirstContactWithPreSupportSubStatus = 'En pré-accompagnement'
export const InProgressWithSupportSubStatus = 'En accompagnement'
export const InProgressWithPublicSupportSubStatus = 'Intervention publique'
export const InProgressWithoutSupportSubStatus = 'En sortie sans accompagnement'
export const ExitWithSupportSubStatus = 'Via accompagnement'
export const ExitWithPublicSupportSubStatus = 'Via intervention publique'
export const ExitWithoutSupportSubStatus = 'Sans accompagnement'
export const ExitAbsentFollowingYear = 'Absent du millésime suivant'

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
        status: HousingStatus.FirstContact,
        title: 'Premier contact',
        color: '--purple-glycine-main-494',
        bgcolor: '--purple-glycine-975',
        subStatusList: [
            {
                title: FirstContactToContactedSubStatus,
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925',
                precisions: [
                    {
                        title: 'Informations transmises - Encore à convaincre',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
                    {
                        title: 'Informations transmises - rendez-vous à fixer',
                        color: '--grey-1000',
                        bgcolor: '--green-menthe-850'
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
                    },
                    {
                        title: 'Besoin de précisions',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Logement récemment vendu',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--brown-caramel-975'
                    }
                ]
            },
            {
                title: FirstContactWithPreSupportSubStatus,
                color: '--blue-ecume-sun-247',
                bgcolor: '--blue-ecume-950',
                precisions: [
                    {
                        title: 'Demande de pièces',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
            }
        ]
    },
    {
        status: HousingStatus.InProgress,
        title: 'Suivi en cours',
        color: '--purple-glycine-main-494',
        bgcolor: '--purple-glycine-975',
        subStatusList: [
            {
                title: InProgressWithSupportSubStatus,
                color: '--green-tilleul-verveine-sun-418',
                bgcolor: '--green-tilleul-verveine-975',
                precisions: [
                    {
                        title: 'Aides aux travaux',
                        color: '--pink-macaron-main-689',
                        bgcolor: '--pink-macaron-975'
                    },
                    {
                        title: 'Aides à la gestion locative',
                        color: '--purple-glycine-975',
                        bgcolor: '--purple-glycine-main-494'
                    },
                    {
                        title: 'Sécurisation loyer',
                        color: '--pink-tuile-975',
                        bgcolor: '--pink-tuile-main-556'
                    },
                    {
                        title: 'Intermédiation Locative (IML)',
                        color: '--brown-caramel-sun-425',
                        bgcolor: '--brown-caramel-975'
                    },
                    {
                        title: 'Conventionnement sans travaux',
                        color: '--brown-caramel-975',
                        bgcolor: '--yellow-moutarde-sun-348-hover'
                    },
                    {
                        title: 'Dispositifs fiscaux',
                        color: '--brown-caramel-975',
                        bgcolor: '--brown-caramel-sun-425'
                    },
                    {
                        title: 'Prime locale',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
                    {
                        title: 'Ma Prime Renov',
                        color: '--blue-ecume-main-400',
                        bgcolor: '--green-archipel-975'
                    },
                    {
                        title: 'Accompagnement à la vente',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247-active'
                    },
                    {
                        title: 'Aides locales',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Autre',
                        color: '--grey-1000',
                        bgcolor: '--beige-gris-galet-moon-821-hover'
                    }
                ]
            },
            {
                title: InProgressWithPublicSupportSubStatus,
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
                title: InProgressWithoutSupportSubStatus,
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
                        title: 'Occupé par le propriétaire ou proche',
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
                    },
                    {
                        title: 'N\'est pas une résidence principale',
                        color: '--brown-caramel-975',
                        bgcolor: '--yellow-moutarde-sun-348-hover'
                    },
                    {
                        title: 'Autre que logement',
                        color: '--brown-caramel-975',
                        bgcolor: '--brown-caramel-sun-425'
                    },
                    {
                        title: 'N\'est plus un logement',
                        color: '--grey-1000',
                        bgcolor: '--beige-gris-galet-moon-821-hover'
                    }
                ]
            },
            {
                title: 'Constaté non-vacant',
                color: '--green-bourgeon-975',
                bgcolor: '--green-bourgeon-sun-425-active',
                precisions: [
                    {
                        title: 'Occupé par le propriétaire ou proche',
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
                    },
                    {
                        title: 'N\'est pas une résidence principale',
                        color: '--brown-caramel-975',
                        bgcolor: '--yellow-moutarde-sun-348-hover'
                    },
                    {
                        title: 'Autre que logement',
                        color: '--brown-caramel-975',
                        bgcolor: '--brown-caramel-sun-425'
                    },
                    {
                        title: 'N\'est plus un logement',
                        color: '--grey-1000',
                        bgcolor: '--beige-gris-galet-moon-821-hover'
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
                bgcolor: '--green-emeraude-925',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
            {
                title: 'Vacance volontaire',
                color: '--green-menthe-sun-373',
                bgcolor: '--green-menthe-975',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
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
                        title: 'Stratégie de gestion',
                        color: '--brown-caramel-975',
                        bgcolor: '--yellow-moutarde-sun-348-hover'
                    }
                ]
            },
            {
                title: 'Mauvais état',
                color: '--blue-ecume-sun-247',
                bgcolor: '--blue-ecume-950',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
            {
                title: 'Mauvaise expérience locative',
                color: '--green-tilleul-verveine-sun-418',
                bgcolor: '--green-tilleul-verveine-975',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
            {
                title: 'Blocage juridique',
                color: '--pink-macaron-sun-406',
                bgcolor: '--pink-macaron-950',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
            {
                title: 'Liée au propriétaire',
                color: '--brown-opera-sun-395',
                bgcolor: '--brown-opera-950',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
            {
                title: 'Projet qui n\'aboutit pas',
                color: '--blue-ecume-975',
                bgcolor: '--blue-ecume-main-400',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
            {
                title: 'Rejet formel de l\'accompagnement',
                color: '--blue-ecume-200',
                bgcolor: '--yellow-tournesol-moon-922-active',
                precisions: [
                    {
                        title: 'Réserve personnelle ou pour une autre personne',
                        color: '--green-tilleul-verveine-975',
                        bgcolor: '--green-archipel-main-557'
                    },
                    {
                        title: 'Montant travaux trop important',
                        color: '--blue-ecume-975',
                        bgcolor: '--blue-ecume-sun-247'
                    },
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
                        title: 'Âge du propriétaire',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-tilleul-verveine-950'
                    },
                    {
                        title: 'Difficultés de gestion / financière',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--pink-macaron-950'
                    },
                    {
                        title: 'Ne répond pas aux critères du marché (prix...)',
                        color: '--pink-macaron-975',
                        bgcolor: '--purple-glycine-sun-319'
                    },
                    {
                        title: 'Aides non accordées',
                        color: '--green-emeraude-sun-425',
                        bgcolor: '--green-menthe-950'
                    }
                ]
            },
        ]
    },
    {
        status: HousingStatus.Exit,
        title: 'Sortie de la vacance',
        color: '--blue-ecume-sun-247',
        bgcolor: '--blue-ecume-950',
        subStatusList: [
            {
                title: ExitWithSupportSubStatus,
                color: '--green-menthe-975',
                bgcolor: '--green-menthe-sun-373',
                precisions: [
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
            },
            {
                title: ExitWithPublicSupportSubStatus,
                color: '--green-emeraude-sun-425',
                bgcolor: '--green-emeraude-925',
                precisions: [
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
            },
            {
                title: ExitWithoutSupportSubStatus,
                color: '--green-menthe-sun-373',
                bgcolor: '--green-menthe-975',
                precisions: [
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
            },
            {
                title: ExitAbsentFollowingYear,
                color: '--blue-ecume-200',
                bgcolor: '--yellow-tournesol-moon-922-active'
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

export const getSubStatusOptions = (status: HousingStatus) => {
    const housingState = getHousingState(status)
    return housingState.subStatusList ? [
        DefaultOption,
        ...housingState.subStatusList.map(subStatus => ({value: subStatus.title, label: subStatus.title}))
    ] : undefined;
}

export const getSubStatusList = (statusList: string[] | HousingStatus[] | undefined) =>
    (statusList ?? [])
        .map(_ => getHousingState(_ as HousingStatus))
        .map(housingState => (housingState.subStatusList?? []).map(subStatus => subStatus.title))
        .flat()
        .filter(_ => _ !== undefined)


export const getSubStatusListOptions = (statusList: string[] | HousingStatus[] | undefined) => (
    (statusList ?? [])
        .map(_ => getHousingState(_ as HousingStatus))
        .filter(_ => _.subStatusList)
        .map(housingState => [
            {value: housingState.title, label: housingState.title, disabled: true},
            ...(housingState.subStatusList?? []).map(subStatus => (
                {value: subStatus.title, label: subStatus.title}
            ))
        ])
        .flat()
        .filter(_ => _ !== undefined)
) as SelectOption[]

export const getStatusPrecisionOptions = (status: HousingStatus, subStatus?: string) => {
    const housingSubStatus = getHousingState(status).subStatusList?.find(s => s.title === subStatus)
    return housingSubStatus?.precisions?.map(subStatus => ({value: subStatus.title, label: subStatus.title}))
}
