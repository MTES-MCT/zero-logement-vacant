import { HousingStatus as HousingStatusDTO } from '@zerologementvacant/models';
import { ReactElement } from 'react';
import { Text } from '../components/_dsfr';
import { isDefined } from '../utils/compareUtils';
import { Housing } from './Housing';
import { SelectOption } from './SelectOption';

export interface HousingState {
  status: HousingStatusDTO;
  title: string;
  subStatusList?: HousingSubStatus[];
  colorFamily: string;
  hint?: ReactElement;
}

export interface HousingSubStatus {
  title: string;
}

/**
 * @deprecated See {@link HousingStatusDTO}
 */
export enum HousingStatus {
  NeverContacted = HousingStatusDTO.NEVER_CONTACTED,
  Waiting = HousingStatusDTO.WAITING,
  FirstContact = HousingStatusDTO.FIRST_CONTACT,
  InProgress = HousingStatusDTO.IN_PROGRESS,
  Completed = HousingStatusDTO.COMPLETED,
  Blocked = HousingStatusDTO.BLOCKED
}

export const HousingStates: HousingState[] = [
  {
    status: HousingStatusDTO.NEVER_CONTACTED,
    title: 'Non suivi',
    colorFamily: 'beige-gris-galet'
  },
  {
    status: HousingStatusDTO.WAITING,
    title: 'En attente de retour',
    hint: (
      <Text spacing="mb-0" as="span">
        Le propriétaire<b> n’a pas répondu au courrier.</b>
      </Text>
    ),
    colorFamily: 'yellow-tournesol'
  },
  {
    status: HousingStatusDTO.FIRST_CONTACT,
    title: 'Premier contact',
    hint: (
      <Text spacing="mb-0" as="span">
        Phase de qualification de la situation et d’engagement du propriétaire
        pour l’évolution de sa situation.
      </Text>
    ),
    colorFamily: 'blue-cumulus',
    subStatusList: [
      { title: 'Intérêt potentiel / En réflexion' },
      { title: 'En pré-accompagnement' },
      { title: 'N’habite pas à l’adresse indiquée' }
    ]
  },
  {
    status: HousingStatusDTO.IN_PROGRESS,
    title: 'Suivi en cours',
    hint: (
      <Text spacing="mb-0" as="span">
        La situation du logement est en cours d’évolution (vers une sortie de la
        vacance ou de passoire énergétique).
      </Text>
    ),
    colorFamily: 'orange-terre-battue',
    subStatusList: [
      { title: 'En accompagnement' },
      { title: 'Intervention publique' },
      { title: 'En sortie sans accompagnement' },
      { title: 'Mutation en cours' }
    ]
  },
  {
    status: HousingStatusDTO.COMPLETED,
    title: 'Suivi terminé',
    hint: (
      <Text spacing="mb-0" as="span">
        Le dossier ne nécessite plus de suivi car la situation du logement a
        évolué ou la base de données d’origine comportait une erreur.
      </Text>
    ),
    colorFamily: 'green-bourgeon',
    subStatusList: [
      { title: 'Sortie de la vacance' },
      { title: "N'était pas vacant" },
      { title: 'Sortie de la passoire énergétique' },
      { title: "N'était pas une passoire énergétique" },
      { title: 'Autre objectif rempli' }
    ]
  },
  {
    status: HousingStatusDTO.BLOCKED,
    title: 'Bloqué',
    hint: (
      <Text spacing="mb-0" as="span">
        La situation ne peut pas évoluer à court ou moyen terme.
      </Text>
    ),
    colorFamily: 'purple-glycine-sun',
    subStatusList: [
      { title: 'Blocage involontaire du propriétaire' },
      { title: 'Blocage volontaire du propriétaire' },
      { title: 'Immeuble / Environnement' },
      { title: 'Tiers en cause' }
    ]
  }
];

export function getHousingState(status: HousingStatusDTO): HousingState {
  return HousingStates[status];
}

export const getSubStatus = (
  status: HousingStatusDTO,
  subStatusTitle: string
): HousingSubStatus | undefined => {
  return getHousingState(status).subStatusList?.filter(
    (s) => s.title === subStatusTitle
  )[0];
};

export const getHousingSubStatus = (
  housing: Housing
): HousingSubStatus | undefined => {
  if (housing.status && housing.subStatus) {
    return getSubStatus(housing.status, housing.subStatus);
  }
};

export function getSubStatusOptions(status: HousingStatusDTO) {
  const housingState = getHousingState(status);
  return housingState.subStatusList
    ? [
        ...housingState.subStatusList.map((subStatus) => ({
          value: subStatus.title,
          label: subStatus.title
        }))
      ]
    : undefined;
}

export function getSubStatusList(
  statuses: string[] | HousingStatusDTO[]
): string[] {
  return statuses
    .map((status) => (typeof status === 'string' ? Number(status) : status))
    .map(getHousingState)
    .flatMap((state) => state.subStatusList)
    .filter(isDefined)
    .map((substatus) => substatus.title);
}

export function getSubStatusListOptions(
  statuses: string[] | HousingStatusDTO[]
): SelectOption[] {
  return statuses
    .map((status) => (typeof status === 'string' ? Number(status) : status))
    .map(getHousingState)
    .flatMap<SelectOption>((state) => {
      const substatuses: SelectOption[] =
        state.subStatusList?.map((substatus) => ({
          value: substatus.title,
          label: substatus.title,
          badgeLabel: `Sous-statut de suivi : ${substatus.title}`
        })) ?? [];
      return [
        { value: state.title, label: state.title, disabled: true },
        ...substatuses
      ];
    })
    .filter(isDefined);
}
