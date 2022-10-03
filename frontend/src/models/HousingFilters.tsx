import { SelectOption } from './SelectOption';
import { LocalityKindLabels, LocalityKinds } from './Establishment';
import { HousingStates } from './HousingState';
import { OwnershipKindLabels, OwnershipKinds } from './Housing';

export interface HousingFilters {
    establishmentIds?: string[];
    ownerKinds?: string[];
    ownerAges?: string[];
    multiOwners?: string[];
    beneficiaryCounts?: string[];
    housingKinds?: string[];
    housingStates?: string[];
    housingAreas?: string[];
    roomsCounts?: string[];
    buildingPeriods?: string[];
    vacancyDurations?: string[];
    isTaxedValues?: OwnershipKinds[];
    ownershipKinds?: string[];
    housingCounts?: string[];
    vacancyRates?: string[];
    campaignsCounts?: string[];
    campaignIds?: string[];
    localities?: string[];
    localityKinds?: string[];
    housingScopesIncluded?: string[];
    housingScopesExcluded?: string[];
    dataYearsIncluded?: number[];
    dataYearsExcluded?: number[];
    status?: number[];
    subStatus?: string[];
    query?: string;
}

export const ownerAgeOptions: SelectOption[] = [
    {value: "lt40", label: "Moins de 40 ans", badgeLabel: "Âge : moins de 40 ans"},
    {value: "40to60", label: "40 - 60 ans", badgeLabel: "Âge : 40 - 60 ans"},
    {value: "60to75", label: "60 - 75 ans", badgeLabel: "Âge : 60 - 75 ans"},
    {value: "75to100", label: "75 - 100 ans", badgeLabel: "Âge : 75 - 100 ans"},
    {value: "gt100", label: "100 ans et plus", badgeLabel: "Âge : 100 ans et plus"},
];

export const ownerKindOptions: SelectOption[] = [
    {value: "Particulier", label: "Particulier"},
    {value: "Investisseur", label: "Investisseur"},
    {value: "SCI", label: "SCI"},
    {value: "Autre", label: "Autres"}
];

export const campaignsCountOptions: SelectOption[] = [
    {value: "0", label: "Jamais contacté"},
    {value: "current", label: "Dans une campagne en cours"},
    {value: "1", label: "Déjà contacté 1 fois"},
    {value: "2", label: "Déjà contacté 2 fois"},
    {value: "gt3", label: "Déjà contacté 3 fois ou plus"}
];

export const statusOptions = [
    ...HousingStates.filter(_ => _.status).map(status => (
        {value: String(status.status), label: status.title}
    ))
]

export const beneficiaryCountOptions: SelectOption[] = [
    {value: "0", label: "Aucun", badgeLabel: "Aucun bénéficiaire"},
    {value: "1", label: "1", badgeLabel: "1 bénéficiaire"},
    {value: "2", label: "2", badgeLabel: "2 bénéficiaires"},
    {value: "3", label: "3", badgeLabel: "3 bénéficiaires"},
    {value: "4", label: "4", badgeLabel: "4 bénéficiaires"},
    {value: "gt5", label: "5 ou plus", badgeLabel: "5 bénéficiaires ou plus"},
];

export const housingCountOptions: SelectOption[] = [
    {value: "lt5", label: "Moins de 5", badgeLabel: "Moins de 5 logements"},
    {value: "5to20", label: "Entre 5 et 20", badgeLabel: "Entre 5 et 20 logements"},
    {value: "20to50", label: "Entre 20 et 50", badgeLabel: "Entre 20 et 50 logements"},
    {value: "gt50", label: "Plus de 50", badgeLabel: "Plus de 50 logements"},
];

export const vacancyRateOptions: SelectOption[] = [
    {value: "lt20", label: "Moins de 20%", badgeLabel: "Moins de 20% de vacance"},
    {value: "20to40", label: "20% - 40%", badgeLabel: "Entre 20% et 40% de vacance"},
    {value: "40to60", label: "40% - 60%", badgeLabel: "Entre 40% et 60% de vacance"},
    {value: "60to80", label: "60% - 80%", badgeLabel: "Entre 60% et 80% de vacance"},
    {value: "gt80", label: "Plus de 80%", badgeLabel: "Plus de 80% de vacance"},
];

export const housingKindOptions: SelectOption[] = [
    {value: "APPART", label: "Appartement"},
    {value: "MAISON", label: "Maison"}
];

export const housingAreaOptions: SelectOption[] = [
    {value: "lt35", label: "Moins de 35 m2"},
    {value: "35to75", label: "35 - 75 m2"},
    {value: "75to100", label: "75 - 100 m2"},
    {value: "gt100", label: "Plus de 100 m2"},
];

export const roomsCountOptions: SelectOption[] = [
    {value: "1", label: "1 pièce"},
    {value: "2", label: "2 pièces"},
    {value: "3", label: "3 pièces"},
    {value: "4", label: "4 pièces"},
    {value: "5", label: "5 pièces et plus"},
];

export const housingStateOptions: SelectOption[] = [
    {value: "Inconfortable", label: "Inconfortable"},
    {value: "Confortable", label: "Confortable"},
    {value: "VeryConfortable", label: "Très confortable"},
];

export const buildingPeriodOptions: SelectOption[] = [
    {value: "lt1919", label: "Avant 1919"},
    {value: "1919to1945", label: "Entre 1919 et 1945"},
    {value: "1946to1990", label: "Entre 1946 et 1990"},
    {value: "gt1991", label: "1991 ou après"},
];

export const multiOwnerOptions: SelectOption[] = [
    {value: "true", label: "Oui", badgeLabel: "Multi-propriétaire"},
    {value: "false", label: "Non", badgeLabel: "Mono-propriétaire"}
];

export const vacancyDurationOptions = [
    {value: "lt2", label: "Moins de 2 ans", badgeLabel: "Durée de vacance : moins de 2 ans"},
    {value: "2to5", label: "Entre 2 et 5 ans", badgeLabel: "Durée de vacance : entre 2 et 5 ans"},
    {value: "5to10", label: "Entre 5 et 10 ans", badgeLabel: "Durée de vacance : entre 5 et 10 ans"},
    {value: "gt10", label: "Plus de 10 ans", badgeLabel: "Durée de vacance : plus de 10 ans"},
];

export const taxedOptions: SelectOption[] = [
    {value: "true", label: "Oui", badgeLabel: "Taxé"},
    {value: "false", label: "Non", badgeLabel: "Non taxé"}
];

export const ownershipKindsOptions: SelectOption[] = [
    {value: OwnershipKinds.Single, label: OwnershipKindLabels[OwnershipKinds.Single]},
    {value: OwnershipKinds.CoOwnership, label: OwnershipKindLabels[OwnershipKinds.CoOwnership]},
    {value: OwnershipKinds.Other, label: OwnershipKindLabels[OwnershipKinds.Other], badgeLabel: "Autre type de propriété"}
];

export const localityKindsOptions = [
    {value: LocalityKinds.ACV, label: LocalityKindLabels[LocalityKinds.ACV]},
    {value: LocalityKinds.PVD, label: LocalityKindLabels[LocalityKinds.PVD]}
];

export const dataYearsIncludedOptions = [
    {value: "2019", label: "2019", badgeLabel: "Millésime 2019"},
    {value: "2020", label: "2020", badgeLabel: "Millésime 2020"},
    {value: "2021", label: "2021", badgeLabel: "Millésime 2021"},
    {value: "2022", label: "2022", badgeLabel: "Millésime 2022"},
];

export const dataYearsExcludedOptions = [
    {value: "2019", label: "2019", badgeLabel: "Millésime 2019 exclu"},
    {value: "2020", label: "2020", badgeLabel: "Millésime 2020 exclu"},
    {value: "2021", label: "2021", badgeLabel: "Millésime 2021 exclu"},
    {value: "2022", label: "2022", badgeLabel: "Millésime 2022 exclu"},
];

export const vacancyReasonsOptions: SelectOption[] = [
    {value: '', label:'Vacance volontaire', disabled:true},
    {value: 'Vacance volontaire - réserve personnelle', label:'réserve personnelle'},
    {value: 'Vacance volontaire - réserve pour une autre personne', label:'réserve pour une autre personne'},
    {value: '', label: 'Liée au logement', disabled:true},
    {value: 'Liée au logement - pas d’accès indépendant', label: 'pas d’accès indépendant'},
    {value: 'Liée au logement - nuisances à proximité', label: 'nuisances à proximité'},
    {value: 'Liée au logement - montant travaux trop important', label: 'montant travaux trop important'},
    {value: 'Liée au logement - ruine / à démolir', label: 'ruine / à démolir'},
    {value: '', label: 'Mauvaise expérience locative', disabled:true},
    {value: 'Mauvaise expérience locative - dégradations', label: 'dégradations'},
    {value: 'Mauvaise expérience locative - impayés de loyer', label: 'impayés de loyer'},
    {value: '', label: 'Blocage juridique', disabled:true},
    {value: 'Blocage juridique - succession difficile, indivision en désaccord', label: 'succession difficile, indivision en désaccord'},
    {value: 'Blocage juridique - expertise judiciaire', label: 'expertise judiciaire'},
    {value: 'Blocage juridique - procédure contre les entrepreneurs', label: 'procédure contre les entrepreneurs'},
    {value: '', label: 'Liée au propriétaire', disabled:true},
    {value: 'Liée au propriétaire - âge du propriétaire', label: 'âge du propriétaire'},
    {value: 'Liée au propriétaire - difficultés de gestion', label: 'difficultés de gestion'},
    {value: 'Autre', label: 'Autre (à préciser en notes)'}
]

export const hasFilters = (housingFilters: HousingFilters) => {
    return Boolean(
        housingFilters.ownerKinds?.length ||
        housingFilters.ownerAges?.length ||
        housingFilters.multiOwners?.length ||
        housingFilters.beneficiaryCounts?.length ||
        housingFilters.housingKinds?.length ||
        housingFilters.housingStates?.length ||
        housingFilters.housingAreas?.length ||
        housingFilters.roomsCounts?.length ||
        housingFilters.buildingPeriods?.length ||
        housingFilters.vacancyDurations?.length ||
        housingFilters.isTaxedValues?.length ||
        housingFilters.ownershipKinds?.length ||
        housingFilters.housingCounts?.length ||
        housingFilters.vacancyRates?.length ||
        housingFilters.campaignsCounts?.length ||
        housingFilters.campaignIds?.length ||
        housingFilters.localities?.length ||
        housingFilters.localityKinds?.length ||
        housingFilters.housingScopesIncluded?.length ||
        housingFilters.housingScopesExcluded?.length ||
        housingFilters.dataYearsIncluded?.length ||
        housingFilters.dataYearsExcluded?.length ||
        housingFilters.query?.length
    );
}
