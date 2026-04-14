export enum HousingStatus {
  NEVER_CONTACTED,
  WAITING,
  FIRST_CONTACT,
  IN_PROGRESS,
  COMPLETED,
  BLOCKED
}

/**
 * A value for the transition to remove the enum `HousingStatus`.
 */
export const HOUSING_STATUS_IDS = [
  'never-contacted',
  'waiting',
  'first-contact',
  'in-progress',
  'completed',
  'blocked'
] as const;
export type HousingStatusId = (typeof HOUSING_STATUS_IDS)[number];

export function toHousingStatusId(status: HousingStatus): HousingStatusId {
  return HOUSING_STATUS_IDS[status];
}

export const HOUSING_STATUS_VALUES: HousingStatus[] = Object.values(
  HousingStatus
).filter((status): status is HousingStatus => typeof status !== 'string');

export function isHousingStatus(value: number): value is HousingStatus {
  return HOUSING_STATUS_VALUES.includes(value);
}

export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  [HousingStatus.NEVER_CONTACTED]: 'Non suivi',
  [HousingStatus.WAITING]: 'En attente de retour',
  [HousingStatus.FIRST_CONTACT]: 'Premier contact',
  [HousingStatus.IN_PROGRESS]: 'Suivi en cours',
  [HousingStatus.COMPLETED]: 'Suivi terminé',
  [HousingStatus.BLOCKED]: 'Suivi bloqué'
};

const HOUSING_SUB_STATUS_LABELS: Record<HousingStatus, ReadonlySet<string>> = {
  [HousingStatus.NEVER_CONTACTED]: new Set(),
  [HousingStatus.WAITING]: new Set(),
  [HousingStatus.FIRST_CONTACT]: new Set([
    'Intérêt potentiel / En réflexion',
    'En pré-accompagnement',
    'N’habite pas à l’adresse indiquée'
  ]),
  [HousingStatus.IN_PROGRESS]: new Set([
    'En accompagnement',
    'Intervention publique',
    'En sortie sans accompagnement',
    'Mutation en cours ou effectuée'
  ]),
  [HousingStatus.COMPLETED]: new Set([
    'Sortie de la vacance',
    "N'était pas vacant",
    'Sortie de la passoire énergétique',
    "N'était pas une passoire énergétique",
    'Autre objectif rempli'
  ]),
  [HousingStatus.BLOCKED]: new Set([
    'Blocage involontaire du propriétaire',
    'Blocage volontaire du propriétaire',
    'Immeuble / Environnement',
    'Tiers en cause'
  ])
} as const;

export function isSubStatusAvailable(
  status: HousingStatus,
  subStatus: string
): boolean {
  return HOUSING_SUB_STATUS_LABELS[status].has(subStatus);
}

export function getSubStatuses(status: HousingStatus): ReadonlySet<string> {
  return HOUSING_SUB_STATUS_LABELS[status];
}
