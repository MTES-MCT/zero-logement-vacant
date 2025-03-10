import {
  BeneficiaryCount,
  BuildingPeriod,
  CampaignDTO,
  ENERGY_CONSUMPTION_VALUES,
  EnergyConsumption,
  EstablishmentDTO,
  HousingByBuilding,
  HousingFiltersDTO,
  HousingKind,
  HousingStatus,
  LivingArea,
  LocalityKind,
  Occupancy,
  OCCUPANCY_VALUES,
  OWNER_KIND_LABELS,
  OWNER_KIND_VALUES,
  OwnerAge,
  OwnerKind,
  OwnershipKind,
  RoomCount,
  VacancyRate
} from '@zerologementvacant/models';
import EnergyConsumptionOption from '../components/_app/AppMultiSelect/EnergyConsumptionOption';
import { OCCUPANCY_LABELS } from './Housing';
import { HousingStates } from './HousingState';
import { LocalityKindLabels, LocalityKinds } from './Locality';
import { VacancyYear } from './VacancyYear';
import { SelectOption } from './SelectOption';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HousingFilters extends HousingFiltersDTO {}

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

export const noCampaignOption: SelectOption = {
  value: 'null',
  label: 'Campagne : dans aucune campagne en cours'
};
export type NoCampaign = typeof noCampaignOption.value;
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

export const ownerKindOptions: SelectOption<OwnerKind>[] =
  OWNER_KIND_VALUES.map((value) => ({
    value: value,
    label: OWNER_KIND_LABELS[value],
    badgeLabel: `Type de propriétaire : ${OWNER_KIND_LABELS[value]}`
  }));

export const statusOptions = (
  statusExcluded?: HousingStatus[]
): SelectOption[] => [
  ...HousingStates.filter(
    (_) => !(statusExcluded ?? []).includes(_.status)
  ).map((status) => ({
    value: String(status.status),
    label: status.title,
    badgeLabel: `Statut de suivi : ${status.title}`,
    hint: status.hint
  }))
];

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

export const cadastralClassificationOptions: SelectOption[] = [
  {
    value: '1',
    label: '1 - Grand luxe',
    badgeLabel: 'Classification cadastrale : 1 - Grand luxe'
  },
  {
    value: '2',
    label: '2 - Luxe',
    badgeLabel: 'Classification cadastrale : 2 - Luxe'
  },
  {
    value: '3',
    label: '3 - Très confortable',
    badgeLabel: 'Classification cadastrale : 3 - Très confortable'
  },
  {
    value: '4',
    label: '4 - Confortable',
    badgeLabel: 'Classification cadastrale : 4 - Confortable'
  },
  {
    value: '5',
    label: '5 - Assez confortable',
    badgeLabel: 'Classification cadastrale : 5 - Assez confortable'
  },
  {
    value: '6',
    label: '6 - Ordinaire',
    badgeLabel: 'Classification cadastrale : 6 - Ordinaire'
  },
  {
    value: '7',
    label: '7 - Médiocre',
    badgeLabel: 'Classification cadastrale : 7 - Médiocre'
  },
  {
    value: '8',
    label: '8 - Très médiocre',
    badgeLabel: 'Classification cadastrale : 8 - Très médiocre'
  }
];

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

export const multiOwnerOptions: SelectOption[] = [
  { value: 'true', label: 'Oui', badgeLabel: 'Multi-propriétaire : oui' },
  { value: 'false', label: 'Non', badgeLabel: 'Multi-propriétaire : non' }
];

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

export const taxedOptions: SelectOption[] = [
  { value: 'true', label: 'Oui', badgeLabel: 'Taxé : oui' },
  { value: 'false', label: 'Non', badgeLabel: 'Taxé : non' }
];

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

export function getIntercommunalityOptions(
  establishments: EstablishmentDTO[]
): SelectOption<EstablishmentDTO['id']>[] {
  return establishments.map((establishment) => ({
    value: establishment.id,
    label: establishment.name,
    badgeLabel: `Intercommunalité : ${establishment.name}`
  }));
}

export const localityKindsOptions: SelectOption<LocalityKind>[] = [
  {
    value: LocalityKinds.ACV,
    label: LocalityKindLabels[LocalityKinds.ACV],
    badgeLabel: `Type de commune : ${LocalityKindLabels[LocalityKinds.ACV]}`
  },
  {
    value: LocalityKinds.PVD,
    label: LocalityKindLabels[LocalityKinds.PVD],
    badgeLabel: `Type de commune : ${LocalityKindLabels[LocalityKinds.PVD]}`
  }
];

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
  }
].sort((optionA, optionB) => optionB.value.localeCompare(optionA.value));

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
  }
].sort((optionA, optionB) => optionB.value.localeCompare(optionA.value));

export const filterCount = (housingFilters: HousingFilters) => {
  return Object.entries(housingFilters).filter(
    ([, v]) => v !== undefined && v !== null && (v as any[]).length > 0
  ).length;
};
export const hasFilters = (housingFilters: HousingFilters) => {
  return filterCount(housingFilters) > 0;
};

export const unselectedOptions = (
  options: SelectOption[],
  selectedValues?: string[]
) =>
  options.filter(
    (option: { value: any }) => !selectedValues?.includes(option.value)
  );

export function hasPerimetersFilter(filters: HousingFilters): boolean {
  return (
    (filters.geoPerimetersIncluded ?? []).length > 0 ||
    (filters.geoPerimetersExcluded ?? []).length > 0
  );
}
