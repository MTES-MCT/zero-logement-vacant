import {
  BeneficiaryCount,
  BuildingPeriod,
  CadastralClassification,
  CampaignDTO,
  DATA_FILE_YEAR_VALUES,
  DataFileYear,
  ENERGY_CONSUMPTION_VALUES,
  EnergyConsumption,
  HousingByBuilding,
  HousingFiltersDTO,
  HousingKind,
  HousingStatus,
  LastMutationTypeFilter,
  LastMutationYearFilter,
  LivingArea,
  LocalityKind,
  Occupancy,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES,
  OWNER_KIND_LABELS,
  OWNER_KIND_VALUES,
  OwnerAge,
  OwnerKind,
  OwnershipKind,
  RoomCount,
  VacancyRate,
  VacancyYear
} from '@zerologementvacant/models';
import { Array, pipe, Record } from 'effect';
import { match, Pattern } from 'ts-pattern';

import EnergyConsumptionOption from '../components/_app/AppMultiSelect/EnergyConsumptionOption';
import { Establishment } from './Establishment';
import { HousingStates } from './HousingState';
import { LocalityKindLabels } from './Locality';
import { SelectOption } from './SelectOption';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HousingFilters extends HousingFiltersDTO {}

export const EMPTY_OPTION = {
  label: 'Pas d’information',
  value: null
};

export const allOccupancyOptions: SelectOption<Occupancy>[] = [
  {
    label: OCCUPANCY_LABELS[Occupancy.UNKNOWN],
    value: Occupancy.UNKNOWN
  },
  ...OCCUPANCY_VALUES.filter(
    (occupancy) => occupancy !== Occupancy.UNKNOWN
  ).map((occupancy) => ({
    label: OCCUPANCY_LABELS[occupancy],
    value: occupancy,
    badgeLabel: `Occupation : ${OCCUPANCY_LABELS[occupancy]}`
  }))
];

/**
 * @deprecated Use {@link OWNER_AGE_OPTIONS} instead.
 */
export const ownerAgeOptions: SelectOption<OwnerAge>[] = [
  {
    value: 'lt40',
    label: 'Moins de 40 ans',
    badgeLabel: 'Âge : moins de 40 ans'
  },
  { value: '40to59', label: '40 - 59 ans', badgeLabel: 'Âge : 40 - 59 ans' },
  { value: '60to74', label: '60 - 74 ans', badgeLabel: 'Âge : 60 - 74 ans' },
  { value: '75to99', label: '75 - 99 ans', badgeLabel: 'Âge : 75 - 99 ans' },
  {
    value: 'gte100',
    label: '100 ans et plus',
    badgeLabel: 'Âge : 100 ans et plus'
  }
];
export const OWNER_AGE_EMPTY_OPTION: SelectOption<null> = {
  value: null,
  label: 'Pas d’information',
  badgeLabel: 'Âge : pas d’information'
};
export const OWNER_AGE_OPTIONS: Record<
  OwnerAge,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  lt40: { label: 'Moins de 40 ans', badgeLabel: 'Âge : moins de 40 ans' },
  '40to59': { label: '40 - 59 ans', badgeLabel: 'Âge : 40 - 59 ans' },
  '60to74': { label: '60 - 74 ans', badgeLabel: 'Âge : 60 - 74 ans' },
  '75to99': { label: '75 - 99 ans', badgeLabel: 'Âge : 75 - 99 ans' },
  gte100: { label: '100 ans et plus', badgeLabel: 'Âge : 100 ans et plus' }
};

export const noCampaignOption: SelectOption = {
  value: 'null',
  label: 'Campagne : dans aucune campagne en cours'
};
export function getCampaignOptions(campaigns: CampaignDTO[]): SelectOption[] {
  return [
    ...campaigns.map((campaign) => ({
      value: campaign.id,
      label: campaign.title,
      badgeLabel: `Campagne : ${campaign.title}`
    })),
    noCampaignOption
  ];
}

/**
 * @deprecated Use {@link OWNER_KIND_OPTIONS} instead.
 */
export const ownerKindOptions: SelectOption<OwnerKind>[] =
  OWNER_KIND_VALUES.map((value) => ({
    value: value,
    label: OWNER_KIND_LABELS[value],
    badgeLabel: `Type de propriétaire : ${OWNER_KIND_LABELS[value].toLowerCase()}`
  }));
export const OWNER_KIND_EMPTY_OPTION = {
  value: null,
  label: 'Pas d’information',
  badgeLabel: `Type de propriétaire : pas d’information`
};
export const OWNER_KIND_OPTIONS: Record<
  OwnerKind,
  { label: string; badgeLabel: string }
> = OWNER_KIND_VALUES.reduce(
  (record, value) => {
    return {
      ...record,
      [value]: {
        label: OWNER_KIND_LABELS[value],
        badgeLabel: `Type de propriétaire : ${OWNER_KIND_LABELS[value].toLowerCase()}`
      }
    };
  },
  {} as Record<OwnerKind, { label: string; badgeLabel: string }>
);

export const statusOptions = (
  statusExcluded?: HousingStatus[]
): SelectOption[] => [
  ...HousingStates.filter(
    (_) => !(statusExcluded ?? []).includes(_.status)
  ).map<SelectOption>((status) => ({
    value: String(status.status),
    label: status.title,
    badgeLabel: `Statut de suivi : ${status.title.toLowerCase()}`,
    hint: status.hint
  }))
];

/**
 * @deprecated Use {@link BENEFICIARY_COUNT_OPTIONS} instead.
 */
export const beneficiaryCountOptions: SelectOption<BeneficiaryCount>[] = [
  {
    value: '0',
    label: 'Aucun',
    badgeLabel: 'Propriétaires secondaires : aucun bénéficiaire'
  },
  {
    value: '1',
    label: '1',
    badgeLabel: 'Propriétaires secondaires : 1 bénéficiaire'
  },
  {
    value: '2',
    label: '2',
    badgeLabel: 'Propriétaires secondaires : 2 bénéficiaires'
  },
  {
    value: '3',
    label: '3',
    badgeLabel: 'Propriétaires secondaires : 3 bénéficiaires'
  },
  {
    value: '4',
    label: '4',
    badgeLabel: 'Propriétaires secondaires : 4 bénéficiaires'
  },
  {
    value: 'gte5',
    label: '5 et plus',
    badgeLabel: 'Propriétaires secondaires : 5 bénéficiaires et plus'
  }
];
export const BENEFICIARY_COUNT_OPTIONS: Record<
  BeneficiaryCount,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  '0': {
    label: 'Aucun',
    badgeLabel: 'Propriétaires secondaires : aucun bénéficiaire'
  },
  '1': {
    label: '1',
    badgeLabel: 'Propriétaires secondaires : 1 bénéficiaire'
  },
  '2': {
    label: '2',
    badgeLabel: 'Propriétaires secondaires : 2 bénéficiaires'
  },
  '3': {
    label: '3',
    badgeLabel: 'Propriétaires secondaires : 3 bénéficiaires'
  },
  '4': {
    label: '4',
    badgeLabel: 'Propriétaires secondaires : 4 bénéficiaires'
  },
  gte5: {
    label: '5 et plus',
    badgeLabel: 'Propriétaires secondaires : 5 bénéficiaires et plus'
  }
};

/**
 * @deprecated Use {@link HOUSING_COUNT_OPTIONS} instead.
 */
export const housingCountOptions: SelectOption<HousingByBuilding>[] = [
  {
    value: 'lt5',
    label: 'Moins de 5',
    badgeLabel: 'Nombre de logements : moins de 5'
  },
  {
    value: '5to19',
    label: 'Entre 5 et 19',
    badgeLabel: 'Nombre de logements : entre 5 et 19'
  },
  {
    value: '20to49',
    label: 'Entre 20 et 49',
    badgeLabel: 'Nombre de logements : entre 20 et 49'
  },
  {
    value: 'gte50',
    label: '50 et plus',
    badgeLabel: 'Nombre de logements : 50 et plus'
  }
];
export const HOUSING_COUNT_OPTIONS: Record<
  HousingByBuilding,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  lt5: {
    label: 'Moins de 5',
    badgeLabel: 'Nombre de logements : moins de 5'
  },
  '5to19': {
    label: 'Entre 5 et 19',
    badgeLabel: 'Nombre de logements : entre 5 et 19'
  },
  '20to49': {
    label: 'Entre 20 et 49',
    badgeLabel: 'Nombre de logements : entre 20 et 49'
  },
  gte50: {
    label: '50 et plus',
    badgeLabel: 'Nombre de logements : 50 et plus'
  }
};

/**
 * @deprecated Use {@link VACANCY_RATE_OPTIONS}
 */
export const vacancyRateOptions: SelectOption<VacancyRate>[] = [
  {
    value: 'lt20',
    label: 'Moins de 20%',
    badgeLabel: 'Taux de vacance : moins de 20%'
  },
  {
    value: '20to39',
    label: '20% - 39%',
    badgeLabel: 'Taux de vacance : entre 20% et 39%'
  },
  {
    value: '40to59',
    label: '40% - 59%',
    badgeLabel: 'Taux de vacance : entre 40% et 59%'
  },
  {
    value: '60to79',
    label: '60% - 79%',
    badgeLabel: 'Taux de vacance : entre 60% et 79%'
  },
  {
    value: 'gte80',
    label: '80% et plus',
    badgeLabel: 'Taux de vacance : 80% et plus'
  }
];
export const VACANCY_RATE_OPTIONS: Record<
  VacancyRate,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  lt20: {
    label: 'Moins de 20%',
    badgeLabel: 'Taux de vacance : moins de 20%'
  },
  '20to39': {
    label: '20% - 39%',
    badgeLabel: 'Taux de vacance : entre 20% et 39%'
  },
  '40to59': {
    label: '40% - 59%',
    badgeLabel: 'Taux de vacance : entre 40% et 59%'
  },
  '60to79': {
    label: '60% - 79%',
    badgeLabel: 'Taux de vacance : entre 60% et 79%'
  },
  gte80: {
    label: '80% et plus',
    badgeLabel: 'Taux de vacance : 80% et plus'
  }
};

export const energyConsumptionOptions: SelectOption<EnergyConsumption>[] =
  ENERGY_CONSUMPTION_VALUES.map((grade) => ({
    value: grade,
    label: grade,
    markup: (props) => (
      <EnergyConsumptionOption {...props} label={grade} value={grade} />
    ),
    badgeLabel: `DPE représentatif (CSTB) ${grade}`
  }));

export const housingKindOptions: SelectOption<HousingKind>[] = [
  {
    value: HousingKind.APARTMENT,
    label: 'Appartement',
    badgeLabel: 'Type de logement : appartement'
  },
  {
    value: HousingKind.HOUSE,
    label: 'Maison',
    badgeLabel: 'Type de logement : maison'
  }
];

/**
 * @deprecated Use {@link LIVING_AREA_OPTIONS} instead.
 */
export const housingAreaOptions: SelectOption<LivingArea>[] = [
  {
    value: 'lt35',
    label: 'Moins de 35 m²',
    badgeLabel: 'Surface : moins de 35 m²'
  },
  {
    value: '35to74',
    label: '35 - 74 m²',
    badgeLabel: 'Surface : entre 35 et 74 m²'
  },
  {
    value: '75to99',
    label: '75 - 99 m²',
    badgeLabel: 'Surface : entre 75 et 99 m²'
  },
  {
    value: 'gte100',
    label: '100 m² et plus',
    badgeLabel: 'Surface : 100 m² et plus'
  }
];
export const LIVING_AREA_OPTIONS: Record<
  LivingArea,
  { label: string; badgeLabel: string }
> = {
  lt35: {
    label: 'Moins de 35 m²',
    badgeLabel: 'Surface : moins de 35 m²'
  },
  '35to74': {
    label: '35 - 74 m²',
    badgeLabel: 'Surface : entre 35 et 74 m²'
  },
  '75to99': {
    label: '75 - 99 m²',
    badgeLabel: 'Surface : entre 75 et 99 m²'
  },
  gte100: {
    label: '100 m² et plus',
    badgeLabel: 'Surface : 100 m² et plus'
  }
};

/**
 * @deprecated Use {@link ROOM_COUNT_OPTIONS} instead.
 */
export const roomsCountOptions: SelectOption<RoomCount>[] = [
  { value: '1', label: '1 pièce', badgeLabel: 'Nombre de pièces : 1' },
  { value: '2', label: '2 pièces', badgeLabel: 'Nombre de pièces : 2' },
  { value: '3', label: '3 pièces', badgeLabel: 'Nombre de pièces : 3' },
  { value: '4', label: '4 pièces', badgeLabel: 'Nombre de pièces : 4' },
  {
    value: 'gte5',
    label: '5 pièces et plus',
    badgeLabel: 'Nombre de pièces : 5 et plus'
  }
];
export const ROOM_COUNT_OPTIONS: Record<
  RoomCount,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  '1': { label: '1 pièce', badgeLabel: 'Nombre de pièces : 1' },
  '2': { label: '2 pièces', badgeLabel: 'Nombre de pièces : 2' },
  '3': { label: '3 pièces', badgeLabel: 'Nombre de pièces : 3' },
  '4': { label: '4 pièces', badgeLabel: 'Nombre de pièces : 4' },
  gte5: {
    label: '5 pièces et plus',
    badgeLabel: 'Nombre de pièces : 5 et plus'
  }
};

/**
 * @deprecated Use {@link CADASTRAL_CLASSIFICATION_OPTIONS} instead.
 */
export const cadastralClassificationOptions: SelectOption[] = [
  {
    value: '1',
    label: '1 - Grand luxe',
    badgeLabel: 'Classement cadastral : 1 - Grand luxe'
  },
  {
    value: '2',
    label: '2 - Luxe',
    badgeLabel: 'Classement cadastral : 2 - Luxe'
  },
  {
    value: '3',
    label: '3 - Très confortable',
    badgeLabel: 'Classement cadastral : 3 - Très confortable'
  },
  {
    value: '4',
    label: '4 - Confortable',
    badgeLabel: 'Classement cadastral : 4 - Confortable'
  },
  {
    value: '5',
    label: '5 - Assez confortable',
    badgeLabel: 'Classement cadastral : 5 - Assez confortable'
  },
  {
    value: '6',
    label: '6 - Ordinaire',
    badgeLabel: 'Classement cadastral : 6 - Ordinaire'
  },
  {
    value: '7',
    label: '7 - Médiocre',
    badgeLabel: 'Classement cadastral : 7 - Médiocre'
  },
  {
    value: '8',
    label: '8 - Très médiocre',
    badgeLabel: 'Classement cadastral : 8 - Très médiocre'
  }
];
export const CADASTRAL_CLASSIFICATION_EMPTY_OPTION: SelectOption<null> = {
  value: null,
  label: 'Pas d’information',
  badgeLabel: 'Classement cadastral : pas d’information'
};
export const CADASTRAL_CLASSIFICATION_OPTIONS: Record<
  CadastralClassification,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  '1': {
    label: '1 - Grand luxe',
    badgeLabel: 'Classement cadastral : 1 - Grand luxe'
  },
  '2': {
    label: '2 - Luxe',
    badgeLabel: 'Classement cadastral : 2 - Luxe'
  },
  '3': {
    label: '3 - Très confortable',
    badgeLabel: 'Classement cadastral : 3 - Très confortable'
  },
  '4': {
    label: '4 - Confortable',
    badgeLabel: 'Classement cadastral : 4 - Confortable'
  },
  '5': {
    label: '5 - Assez confortable',
    badgeLabel: 'Classement cadastral : 5 - Assez confortable'
  },
  '6': {
    label: '6 - Ordinaire',
    badgeLabel: 'Classement cadastral : 6 - Ordinaire'
  },
  '7': {
    label: '7 - Médiocre',
    badgeLabel: 'Classement cadastral : 7 - Médiocre'
  },
  '8': {
    label: '8 - Très médiocre',
    badgeLabel: 'Classement cadastral : 8 - Très médiocre'
  }
};

/**
 * @deprecated Use {@link BUILDING_PERIOD_OPTIONS} instead.
 */
export const buildingPeriodOptions: SelectOption<BuildingPeriod>[] = [
  {
    value: 'lt1919',
    label: 'Avant 1919',
    badgeLabel: 'Date de construction : avant 1919'
  },
  {
    value: '1919to1945',
    label: 'Entre 1919 et 1945',
    badgeLabel: 'Date de construction : entre 1919 et 1945'
  },
  {
    value: '1946to1990',
    label: 'Entre 1946 et 1990',
    badgeLabel: 'Date de construction : entre 1946 et 1990'
  },
  {
    value: 'gte1991',
    label: '1991 ou après',
    badgeLabel: 'Date de construction : 1991 ou après'
  }
];
export const BUILDING_PERIOD_OPTIONS: Record<
  BuildingPeriod,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  lt1919: {
    label: 'Avant 1919',
    badgeLabel: 'Date de construction : avant 1919'
  },
  '1919to1945': {
    label: 'Entre 1919 et 1945',
    badgeLabel: 'Date de construction : entre 1919 et 1945'
  },
  '1946to1990': {
    label: 'Entre 1946 et 1990',
    badgeLabel: 'Date de construction : entre 1946 et 1990'
  },
  gte1991: {
    label: '1991 ou après',
    badgeLabel: 'Date de construction : 1991 ou après'
  }
};

export const multiOwnerOptions: SelectOption[] = [
  { value: 'true', label: 'Oui', badgeLabel: 'Multi-propriétaire : oui' },
  { value: 'false', label: 'Non', badgeLabel: 'Multi-propriétaire : non' }
];

/**
 * @deprecated Use {@link VACANCY_YEAR_OPTIONS} instead.
 */
export const vacancyYearOptions: SelectOption<VacancyYear>[] = [
  {
    value: '2021',
    label: '2021',
    badgeLabel: 'Début de vacance : depuis 2021'
  },
  {
    value: '2020',
    label: '2020',
    badgeLabel: 'Début de vacance : depuis 2020'
  },
  {
    value: '2019',
    label: '2019',
    badgeLabel: 'Début de vacance : depuis 2019'
  },
  {
    value: '2018to2015',
    label: 'Entre 2018 et 2015',
    badgeLabel: 'Début de vacance : entre 2018 et 2015'
  },
  {
    value: '2014to2010',
    label: 'Entre 2014 et 2010',
    badgeLabel: 'Début de vacance : entre 2014 et 2010'
  },
  {
    value: 'before2010',
    label: 'Avant 2010',
    badgeLabel: 'Début de vacance : avant 2010'
  },
  {
    value: 'missingData',
    label: 'Pas d’information',
    badgeLabel: 'Début de vacance : pas d’information'
  },
  {
    value: 'inconsistency2022',
    label: '2022 (incohérence donnée source)',
    badgeLabel: 'Début de vacance : 2022 (incohérence donnée source)'
  }
];
export const VACANCY_YEAR_OPTIONS: Record<
  VacancyYear,
  {
    label: string;
    badgeLabel: string;
  }
> = {
  '2022': {
    label: '2022',
    badgeLabel: 'Début de vacance : depuis 2022'
  },
  '2021': {
    label: '2021',
    badgeLabel: 'Début de vacance : depuis 2021'
  },
  '2020': {
    label: '2020',
    badgeLabel: 'Début de vacance : depuis 2020'
  },
  '2019': {
    label: '2019',
    badgeLabel: 'Début de vacance : depuis 2019'
  },
  '2018to2015': {
    label: 'Entre 2018 et 2015',
    badgeLabel: 'Début de vacance : entre 2018 et 2015'
  },
  '2014to2010': {
    label: 'Entre 2014 et 2010',
    badgeLabel: 'Début de vacance : entre 2014 et 2010'
  },
  before2010: {
    label: 'Avant 2010',
    badgeLabel: 'Début de vacance : avant 2010'
  },
  missingData: {
    label: 'Pas d’information',
    badgeLabel: 'Début de vacance : pas d’information'
  },
  inconsistency2022: {
    label: '2022 (incohérence donnée source)',
    badgeLabel: 'Début de vacance : 2022 (incohérence donnée source)'
  }
};

export const taxedOptions: SelectOption[] = [
  { value: 'true', label: 'Oui', badgeLabel: 'Taxe sur la vacance : oui' },
  { value: 'false', label: 'Non', badgeLabel: 'Taxe sur la vacance : non' }
];

/**
 * @deprecated Use {@link OWNERSHIP_KIND_OPTIONS} instead.
 */
export const ownershipKindsOptions: SelectOption<OwnershipKind>[] = [
  {
    value: 'single',
    label: 'Monopropriété',
    badgeLabel: 'Type de propriété : monopropriété'
  },
  {
    value: 'co',
    label: 'Copropriété',
    badgeLabel: 'Type de propriété : copropriété'
  },
  {
    value: 'other',
    label: 'Autre',
    badgeLabel: 'Type de propriété : autre'
  }
];
export const OWNERSHIP_KIND_OPTIONS: Record<
  OwnershipKind,
  { label: string; badgeLabel: string }
> = {
  single: {
    label: 'Monopropriété',
    badgeLabel: 'Type de propriété : monopropriété'
  },
  co: {
    label: 'Copropriété',
    badgeLabel: 'Type de propriété : copropriété'
  },
  other: {
    label: 'Autre',
    badgeLabel: 'Type de propriété : autre'
  }
};

export function getIntercommunalityOptions(
  establishments: Establishment[]
): SelectOption<Establishment['id']>[] {
  return establishments.map((establishment) => ({
    value: establishment.id,
    label: establishment.name,
    badgeLabel: `Intercommunalité : ${establishment.name}`
  }));
}

/**
 * @deprecated Use {@link LOCALITY_KIND_OPTIONS} instead.
 */
export const localityKindsOptions: SelectOption<LocalityKind>[] = [
  {
    value: 'ACV',
    label: LocalityKindLabels['ACV'],
    badgeLabel: `Type de commune : ${LocalityKindLabels['ACV']}`
  },
  {
    value: 'PVD',
    label: LocalityKindLabels['PVD'],
    badgeLabel: `Type de commune : ${LocalityKindLabels['PVD']}`
  }
];
export const LOCALITY_KIND_EMPTY_OPTION: SelectOption<null> = {
  value: null,
  label: 'Sans type',
  badgeLabel: `Type de commune : sans type`
};
export const LOCALITY_KIND_OPTIONS: Record<
  LocalityKind,
  { label: string; badgeLabel: string }
> = {
  ACV: {
    label: 'Action Cœur de Ville',
    badgeLabel: 'Type de commune : Action Cœur de Ville'
  },
  PVD: {
    label: 'Petites Villes de Demain',
    badgeLabel: 'Type de commune : Petites Villes de Demain'
  }
};

/**
 * @deprecated Use {@link DATA_FILE_YEAR_INCLUDED_OPTIONS} instead.
 */
export const dataFileYearsIncludedOptions: SelectOption[] = [
  {
    value: 'ff-2023-locatif',
    label: 'Fichiers fonciers 2023 (parc locatif privé)',
    badgeLabel:
      'Source et millésime inclus : Fichiers fonciers 2023 (parc locatif privé)'
  },
  {
    value: 'lovac-2019',
    label: 'LOVAC 2019 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2019 (>2 ans)'
  },
  {
    value: 'lovac-2020',
    label: 'LOVAC 2020 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2020 (>2 ans)'
  },
  {
    value: 'lovac-2021',
    label: 'LOVAC 2021 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2021 (>2 ans)'
  },
  {
    value: 'lovac-2022',
    label: 'LOVAC 2022 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2022 (>2 ans)'
  },
  {
    value: 'lovac-2023',
    label: 'LOVAC 2023 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2023 (>2 ans)'
  },
  {
    value: 'lovac-2024',
    label: 'LOVAC 2024 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2024 (>2 ans)'
  },
  {
    value: 'lovac-2025',
    label: 'LOVAC 2025 (>2 ans)',
    badgeLabel: 'Source et millésime inclus : LOVAC 2025 (>2 ans)'
  }
].sort((optionA, optionB) => optionB.value.localeCompare(optionA.value));

export const DATA_FILE_YEAR_INCLUDED_OPTIONS = DATA_FILE_YEAR_VALUES.reduce(
  (record, value) => {
    return {
      ...record,
      [value]: match(value)
        .with('ff-2023-locatif', () => {
          const label = 'Fichiers fonciers 2023 (parc locatif privé)';
          return {
            label,
            badgeLabel: `Source et millésime inclus: ${label}`
          };
        })
        .with(Pattern.string.startsWith('lovac-'), (value) => {
          const label = `LOVAC ${value.slice('lovac-'.length)} (>2 ans)`;
          return {
            label,
            badgeLabel: `Source et millésime inclus : ${label}`
          };
        })
        .exhaustive()
    };
  },
  {} as Record<DataFileYear, { label: string; badgeLabel: string }>
);
export const DATA_FILE_YEAR_EXCLUDED_OPTIONS = DATA_FILE_YEAR_VALUES.reduce(
  (record, value) => {
    return {
      ...record,
      [value]: match(value)
        .with('ff-2023-locatif', () => {
          const label = 'Fichiers fonciers 2023 (parc locatif privé)';
          return {
            label,
            badgeLabel: `Source et millésime exclus : ${label}`
          };
        })
        .with(Pattern.string.startsWith('lovac-'), (value) => {
          const label = `LOVAC ${value.slice('lovac-'.length)} (>2 ans)`;
          return {
            label,
            badgeLabel: `Source et millésime exclus : ${label}`
          };
        })
        .exhaustive()
    };
  },
  {} as Record<DataFileYear, { label: string; badgeLabel: string }>
);

/**
 * @deprecated Use {@link DATA_FILE_YEAR_EXCLUDED_OPTIONS} instead.
 */
export const dataFileYearsExcludedOptions: SelectOption[] = [
  {
    value: 'ff-2023-locatif',
    label: 'Fichiers fonciers 2023 (parc locatif privé)',
    badgeLabel:
      'Source et millésime exclus : Fichiers fonciers 2023 (parc locatif privé)'
  },
  {
    value: 'lovac-2019',
    label: 'LOVAC 2019 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2019 (>2 ans)'
  },
  {
    value: 'lovac-2020',
    label: 'LOVAC 2020 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2020 (>2 ans)'
  },
  {
    value: 'lovac-2021',
    label: 'LOVAC 2021 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2021 (>2 ans)'
  },
  {
    value: 'lovac-2022',
    label: 'LOVAC 2022 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2022 (>2 ans)'
  },
  {
    value: 'lovac-2023',
    label: 'LOVAC 2023 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2023 (>2 ans)'
  },
  {
    value: 'lovac-2024',
    label: 'LOVAC 2024 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2024 (>2 ans)'
  },
  {
    value: 'lovac-2025',
    label: 'LOVAC 2025 (>2 ans)',
    badgeLabel: 'Source et millésime exclus : LOVAC 2025 (>2 ans)'
  }
].sort((optionA, optionB) => optionB.value.localeCompare(optionA.value));

export function hasPerimetersFilter(filters: HousingFilters): boolean {
  return (
    (filters.geoPerimetersIncluded ?? []).length > 0 ||
    (filters.geoPerimetersExcluded ?? []).length > 0
  );
}

export const LAST_MUTATION_YEAR_EMPTY_OPTION: SelectOption<null> = {
  ...EMPTY_OPTION,
  badgeLabel: 'Dernière mutation (date) : pas d’information'
};
export const LAST_MUTATION_YEAR_LABELS: Record<LastMutationYearFilter, string> =
  {
    '2024': '2024',
    '2023': '2023',
    '2022': '2022',
    '2021': '2021',
    '2015to2020': '2015 - 2020',
    '2010to2014': '2010 - 2014',
    lte2009: 'Avant 2010'
  };
export const LAST_MUTATION_YEAR_SELECT_OPTIONS: SelectOption<LastMutationYearFilter | null>[] =
  pipe(
    LAST_MUTATION_YEAR_LABELS,
    Record.map((value, key) => ({
      value: key,
      label: value
    })),
    Record.values,
    Array.append(LAST_MUTATION_YEAR_EMPTY_OPTION),
    Array.map((option) => ({
      ...option,
      badgeLabel: `Dernière mutation (date) : ${option.label.toLowerCase()}`
    }))
  );

export const LAST_MUTATION_TYPE_EMPTY_OPTION: SelectOption<null> = {
  ...EMPTY_OPTION,
  badgeLabel: 'Dernière mutation (type) : pas d’information'
};
export const LAST_MUTATION_TYPE_LABELS: Record<LastMutationTypeFilter, string> =
  {
    donation: 'Donation',
    sale: 'Vente'
  };
export const LAST_MUTATION_TYPE_SELECT_OPTIONS: SelectOption<LastMutationTypeFilter | null>[] =
  pipe(
    LAST_MUTATION_TYPE_LABELS,
    Record.map((value, key) => ({
      value: key,
      label: value
    })),
    Record.values,
    Array.append(LAST_MUTATION_TYPE_EMPTY_OPTION),
    Array.map((option) => ({
      ...option,
      badgeLabel: `Dernière mutation (type) : ${option.label.toLowerCase()}`
    }))
  );
