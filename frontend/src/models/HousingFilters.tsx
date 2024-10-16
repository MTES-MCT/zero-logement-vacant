import {
  BeneficiaryCount,
  BuildingPeriod,
  CampaignCount,
  ENERGY_CONSUMPTION_VALUES,
  EnergyConsumption,
  HousingByBuilding,
  HousingFiltersDTO,
  HousingKind,
  HousingStatus,
  LivingArea,
  LocalityKind,
  Occupancy,
  OCCUPANCY_VALUES,
  OwnerAge,
  OwnershipKind,
  RoomCount,
  VacancyRate
} from '@zerologementvacant/models';
import { OptionTreeElement, SelectOption } from './SelectOption';
import { HousingStates } from './HousingState';
import { OCCUPANCY_LABELS } from './Housing';
import { LocalityKindLabels, LocalityKinds } from './Locality';
import EnergyConsumptionOption from '../components/_app/AppMultiSelect/EnergyConsumptionOption';

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
    badgeLabel: OCCUPANCY_LABELS[occupancy]
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

export const ownerKindOptions: SelectOption[] = [
  { value: 'Particulier', label: 'Particulier' },
  { value: 'Investisseur', label: 'Investisseur' },
  { value: 'SCI', label: 'SCI' },
  { value: 'Autre', label: 'Autres' }
];

export const campaignsCountOptions: SelectOption<CampaignCount>[] = [
  { value: '0', label: 'Dans aucune campagne en cours' },
  { value: '1', label: 'Déjà contacté 1 fois' },
  { value: '2', label: 'Déjà contacté 2 fois' },
  { value: 'gt2', label: 'Déjà contacté 3 fois et plus' }
];

export const statusOptions = (
  statusExcluded?: HousingStatus[]
): SelectOption[] => [
  ...HousingStates.filter(
    (_) => !(statusExcluded ?? []).includes(_.status)
  ).map((status) => ({
    value: String(status.status),
    label: status.title,
    hint: status.hint
  }))
];

export const beneficiaryCountOptions: SelectOption<BeneficiaryCount>[] = [
  { value: '0', label: 'Aucun', badgeLabel: 'Aucun bénéficiaire' },
  { value: '1', label: '1', badgeLabel: '1 bénéficiaire' },
  { value: '2', label: '2', badgeLabel: '2 bénéficiaires' },
  { value: '3', label: '3', badgeLabel: '3 bénéficiaires' },
  { value: '4', label: '4', badgeLabel: '4 bénéficiaires' },
  { value: 'gte5', label: '5 et plus', badgeLabel: '5 bénéficiaires et plus' }
];

export const housingCountOptions: SelectOption<HousingByBuilding>[] = [
  { value: 'lt5', label: 'Moins de 5', badgeLabel: 'Moins de 5 logements' },
  {
    value: '5to19',
    label: 'Entre 5 et 19',
    badgeLabel: 'Entre 5 et 19 logements'
  },
  {
    value: '20to49',
    label: 'Entre 20 et 49',
    badgeLabel: 'Entre 20 et 49 logements'
  },
  { value: 'gte50', label: '50 et plus', badgeLabel: '50 logements et plus' }
];

export const vacancyRateOptions: SelectOption<VacancyRate>[] = [
  {
    value: 'lt20',
    label: 'Moins de 20%',
    badgeLabel: 'Moins de 20% de vacance'
  },
  {
    value: '20to39',
    label: '20% - 39%',
    badgeLabel: 'Entre 20% et 39% de vacance'
  },
  {
    value: '40to59',
    label: '40% - 59%',
    badgeLabel: 'Entre 40% et 59% de vacance'
  },
  {
    value: '60to79',
    label: '60% - 79%',
    badgeLabel: 'Entre 60% et 79% de vacance'
  },
  {
    value: 'gte80',
    label: '80% et plus',
    badgeLabel: '80% de vacance et plus'
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
  { value: HousingKind.APARTMENT, label: 'Appartement' },
  { value: HousingKind.HOUSE, label: 'Maison' }
];

export const housingAreaOptions: SelectOption<LivingArea>[] = [
  { value: 'lt35', label: 'Moins de 35 m²' },
  { value: '35to74', label: '35 - 74 m²' },
  { value: '75to99', label: '75 - 99 m²' },
  { value: 'gte100', label: '100 m² et plus' }
];

export const roomsCountOptions: SelectOption<RoomCount>[] = [
  { value: '1', label: '1 pièce' },
  { value: '2', label: '2 pièces' },
  { value: '3', label: '3 pièces' },
  { value: '4', label: '4 pièces' },
  { value: 'gte5', label: '5 pièces et plus' }
];

export const cadastralClassificationOptions: SelectOption[] = [
  { value: '1', label: '1 - Grand luxe' },
  { value: '2', label: '2 - Luxe' },
  { value: '3', label: '3 - Très confortable' },
  { value: '4', label: '4 - Confortable' },
  { value: '5', label: '5 - Assez confortable' },
  { value: '6', label: '6 - Ordinaire' },
  { value: '7', label: '7 - Médiocre' },
  { value: '8', label: '8 - Très médiocre' }
];

export const buildingPeriodOptions: SelectOption<BuildingPeriod>[] = [
  { value: 'lt1919', label: 'Avant 1919' },
  { value: '1919to1945', label: 'Entre 1919 et 1945' },
  { value: '1946to1990', label: 'Entre 1946 et 1990' },
  { value: 'gte1991', label: '1991 ou après' }
];

export const multiOwnerOptions: SelectOption[] = [
  { value: 'true', label: 'Oui', badgeLabel: 'Multi-propriétaire' },
  { value: 'false', label: 'Non', badgeLabel: 'Mono-propriétaire' }
];

export const vacancyDurationOptions: SelectOption[] = [
  {
    value: 'lt2',
    label: 'Vacance conjoncturelle (Moins de 2 ans)'
  },
  {
    value: '2',
    label: '2 ans',
    badgeLabel: 'Durée de vacance : 2 ans'
  },
  {
    value: 'gt2',
    label: 'Vacance structurelle (2 ans et plus)'
  },
  {
    value: '3to4',
    label: 'Entre 3 et 4 ans',
    badgeLabel: 'Durée de vacance : entre 3 et 4 ans'
  },
  {
    value: '5to9',
    label: 'Entre 5 et 9 ans',
    badgeLabel: 'Durée de vacance : entre 5 et 9 ans'
  },
  {
    value: 'gte10',
    label: '10 ans et plus',
    badgeLabel: 'Durée de vacance : 10 ans et plus'
  }
];

export const taxedOptions: SelectOption[] = [
  { value: 'true', label: 'Oui', badgeLabel: 'Taxé' },
  { value: 'false', label: 'Non', badgeLabel: 'Non taxé' }
];

export const ownershipKindsOptions: SelectOption<OwnershipKind>[] = [
  {
    value: 'single',
    label: 'Monopropriété'
  },
  {
    value: 'co',
    label: 'Copropriété'
  },
  {
    value: 'other',
    label: 'Autre',
    badgeLabel: 'Autre type de propriété'
  }
];

export const localityKindsOptions: SelectOption<LocalityKind>[] = [
  { value: LocalityKinds.ACV, label: LocalityKindLabels[LocalityKinds.ACV] },
  { value: LocalityKinds.PVD, label: LocalityKindLabels[LocalityKinds.PVD] }
];

export const dataFileYearsIncludedOptions: SelectOption[] = [
  { value: 'lovac-2019', label: 'ZLV 2019 (>2 ans)', badgeLabel: 'ZLV 2019 (>2 ans)' },
  { value: 'lovac-2020', label: 'ZLV 2020 (>2 ans)', badgeLabel: 'ZLV 2020 (>2 ans)' },
  { value: 'lovac-2021', label: 'ZLV 2021 (>2 ans)', badgeLabel: 'ZLV 2021 (>2 ans)' },
  { value: 'lovac-2022', label: 'ZLV 2022 (>2 ans)', badgeLabel: 'ZLV 2022 (>2 ans)' },
  { value: 'lovac-2023', label: 'ZLV 2023 (>2 ans)', badgeLabel: 'ZLV 2023 (>2 ans)' },
  { value: 'lovac-2024', label: 'LOVAC 2024 (>2 ans)', badgeLabel: 'LOVAC 2024 (>2 ans)' }
].sort((optionA, optionB) => optionB.value.localeCompare(optionA.value));

export const dataFileYearsExcludedOptions: SelectOption[] = [
  { value: 'lovac-2019', label: 'ZLV 2019 (>2 ans)', badgeLabel: 'ZLV 2019 (>2 ans) exclu' },
  { value: 'lovac-2020', label: 'ZLV 2020 (>2 ans)', badgeLabel: 'ZLV 2020 (>2 ans) exclu' },
  { value: 'lovac-2021', label: 'ZLV 2021 (>2 ans)', badgeLabel: 'ZLV 2021 (>2 ans) exclu' },
  { value: 'lovac-2022', label: 'ZLV 2022 (>2 ans)', badgeLabel: 'ZLV 2022 (>2 ans) exclu' },
  { value: 'lovac-2023', label: 'ZLV 2023 (>2 ans)', badgeLabel: 'ZLV 2023 (>2 ans) exclu' },
  { value: 'lovac-2024', label: 'LOVAC 2024 (>2 ans)', badgeLabel: 'LOVAC 2024 (>2 ans) exclu' }
].sort((optionA, optionB) => optionB.value.localeCompare(optionA.value));

export const BlockingPointOptions: OptionTreeElement[] = [
  {
    title: 'Liés au propriétaire',
    elements: [
      {
        title: 'Blocage involontaire',
        elements: [
          'Mise en location ou vente infructueuse',
          'Succession difficile, indivision en désaccord',
          "Défaut d'entretien / nécessité de travaux",
          'Problèmes de financements / Dossier non-éligible',
          "Manque de conseil en amont de l'achat",
          'En incapacité (âge, handicap, précarité...)'
        ]
      },
      {
        title: 'Blocage volontaire',
        elements: [
          'Réserve personnelle ou pour une autre personne',
          'Stratégie de gestion',
          'Mauvaise expérience locative',
          'Montants des travaux perçus comme trop importants',
          'Refus catégorique, sans raison'
        ]
      }
    ]
  },
  {
    title: 'Extérieurs au propriétaire',
    elements: [
      {
        title: 'Immeuble / Environnement',
        elements: [
          "Pas d'accès indépendant",
          'Immeuble dégradé',
          'Ruine / Immeuble à démolir',
          'Nuisances à proximité',
          'Risques Naturels / Technologiques'
        ]
      },
      {
        title: 'Tiers en cause',
        elements: [
          'Entreprise(s) en défaut',
          'Copropriété en désaccord',
          'Expertise judiciaire',
          "Autorisation d'urbanisme refusée / Blocage ABF",
          'Interdiction de location'
        ]
      }
    ]
  }
];

export const SupportOptions: OptionTreeElement[] = [
  {
    title: 'Dispositifs',
    elements: [
      {
        title: 'Dispositifs incitatifs',
        elements: [
          'Conventionnement avec travaux',
          'Aides locales travaux',
          'Conventionnement sans travaux',
          'Aides à la gestion locative',
          'Intermédiation Locative (IML)',
          'Dispositif fiscal',
          'Prime locale vacance',
          'Prime vacance France Ruralités',
          'Ma Prime Renov',
          'Prime Rénovation Globale',
          'Prime locale rénovation énergétique',
          'Accompagnement à la vente',
          'Autre'
        ]
      },
      {
        title: 'Dispositifs coercitifs',
        elements: [
          'ORI - TIRORI',
          'Bien sans maître',
          'Abandon manifeste',
          'DIA - préemption',
          "Procédure d'habitat indigne",
          'Permis de louer',
          'Permis de diviser'
        ]
      },
      {
        title: 'Hors dispositif public',
        elements: [
          'Accompagné par un professionnel (archi, agent immo...)',
          'Propriétaire autonome'
        ]
      }
    ]
  },
  {
    title: 'Mode opératoire',
    elements: [
      {
        title: 'Travaux',
        elements: ['À venir', 'En cours', 'Terminés']
      },
      {
        title: 'Location / Occupation',
        elements: ['À venir', 'En cours', 'Nouvelle occupation']
      },
      {
        title: 'Mutation',
        elements: ['À venir', 'En cours', 'Effectuée']
      }
    ]
  }
];

export const OptionTreeSeparator = ' > ';

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
