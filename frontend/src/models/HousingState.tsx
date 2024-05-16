import { DefaultOption, SelectOption } from './SelectOption';
import { Housing } from './Housing';
import { ReactElement } from 'react';
import { Text } from '../components/_dsfr';

export interface HousingState {
  status: HousingStatus;
  title: string;
  subStatusList?: HousingSubStatus[];
  colorFamily: string;
  hint?: ReactElement;
}

export interface HousingSubStatus {
  title: string;
}

export enum HousingStatus {
  NeverContacted,
  Waiting,
  FirstContact,
  InProgress,
  Completed,
  Blocked,
}

export const HOUSING_STATUSES: HousingStatus[] = Object.values(
  HousingStatus,
).filter((_) => typeof _ === 'number') as HousingStatus[];

export const FirstContactToContactedSubStatus =
  'Intérêt potentiel / En réflexion';
export const FirstContactWithPreSupportSubStatus = 'En pré-accompagnement';
export const FirstContactNpai = 'NPAI';
export const InProgressWithSupportSubStatus = 'En accompagnement';
export const InProgressWithPublicSupportSubStatus = 'Intervention publique';
export const InProgressWithoutSupportSubStatus =
  'En sortie sans accompagnement';
export const MutationInProgress = 'Mutation en cours';
export const CompletedWithVacancyExit = 'Sortie de la vacance';
export const CompletedNotVacant = "N'était pas vacant";
export const CompletedWithPoorlyInsulatedExit =
  'Sortie de la passoire énergétique';
export const CompletedNotPoorlyInsulated =
  "N'était pas une passoire énergétique";
export const OtherObjectiveAchieved = 'Autre objectif rempli';
export const BlockedByOwnerInvoluntary = 'Blocage involontaire du propriétaire';
export const BlockedByOwnerVoluntary = 'Blocage volontaire du propriétaire';
export const BuildingEnvironment = 'Immeuble / Environnement';
export const ThirdPartiesInvolved = 'Tiers en cause';

export const HousingStates: HousingState[] = [
  {
    status: HousingStatus.NeverContacted,
    title: 'Non suivi',
    colorFamily: 'beige-gris-galet',
  },
  {
    status: HousingStatus.Waiting,
    title: 'En attente de retour',
    hint: (
      <Text spacing="mb-0" as="span">
        Le propriétaire<b> n’a pas répondu au courrier.</b>
      </Text>
    ),
    colorFamily: 'yellow-tournesol',
  },
  {
    status: HousingStatus.FirstContact,
    title: 'Premier contact',
    hint: (
      <Text spacing="mb-0" as="span">
        Phase de qualification de la situation et d’engagement du propriétaire
        pour l’évolution de sa situation.
      </Text>
    ),
    colorFamily: 'blue-cumulus',
    subStatusList: [
      {
        title: FirstContactToContactedSubStatus,
      },
      {
        title: FirstContactWithPreSupportSubStatus,
      },
      {
        title: FirstContactNpai,
      },
    ],
  },
  {
    status: HousingStatus.InProgress,
    title: 'Suivi en cours',
    hint: (
      <Text spacing="mb-0" as="span">
        La situation du logement est en cours d’évolution (vers une sortie de la
        vacance ou de passoire énergétique).
      </Text>
    ),
    colorFamily: 'orange-terre-battue',
    subStatusList: [
      {
        title: InProgressWithSupportSubStatus,
      },
      {
        title: InProgressWithPublicSupportSubStatus,
      },
      {
        title: InProgressWithoutSupportSubStatus,
      },
      {
        title: MutationInProgress,
      },
    ],
  },
  {
    status: HousingStatus.Completed,
    title: 'Suivi terminé',
    hint: (
      <Text spacing="mb-0" as="span">
        Le dossier ne nécessite plus de suivi car la situation du logement a
        évolué ou la base de données d’origine comportait une erreur.
      </Text>
    ),
    colorFamily: 'green-bourgeon',
    subStatusList: [
      {
        title: CompletedWithVacancyExit,
      },
      {
        title: CompletedNotVacant,
      },
      {
        title: CompletedWithPoorlyInsulatedExit,
      },
      {
        title: CompletedNotPoorlyInsulated,
      },
      {
        title: OtherObjectiveAchieved,
      },
    ],
  },
  {
    status: HousingStatus.Blocked,
    title: 'Bloqué',
    hint: (
      <Text spacing="mb-0" as="span">
        La situation ne peut pas évoluer à court ou moyen terme.
      </Text>
    ),
    colorFamily: 'purple-glycine-sun',
    subStatusList: [
      {
        title: BlockedByOwnerInvoluntary,
      },
      {
        title: BlockedByOwnerVoluntary,
      },
      {
        title: BuildingEnvironment,
      },
      {
        title: ThirdPartiesInvolved,
      },
    ],
  },
];

export const getHousingState = (status: HousingStatus) => {
  return HousingStates[status];
};

export const getSubStatus = (
  status: HousingStatus,
  subStatusTitle: string,
): HousingSubStatus | undefined => {
  return getHousingState(status).subStatusList?.filter(
    (s) => s.title === subStatusTitle,
  )[0];
};

export const getHousingSubStatus = (
  housing: Housing,
): HousingSubStatus | undefined => {
  if (housing.status && housing.subStatus) {
    return getSubStatus(housing.status, housing.subStatus);
  }
};

export const getSubStatusOptions = (status: HousingStatus) => {
  const housingState = getHousingState(status);
  return housingState.subStatusList
    ? [
        {
          ...DefaultOption,
          label: 'Sélectionnez un sous-statut de suivi',
        },
        ...housingState.subStatusList.map((subStatus) => ({
          value: subStatus.title,
          label: subStatus.title,
        })),
      ]
    : undefined;
};

export const getSubStatusList = (
  statusList: string[] | HousingStatus[] | undefined,
) =>
  (statusList ?? [])
    .map((_) => getHousingState(_ as HousingStatus))
    .map((housingState) =>
      (housingState.subStatusList ?? []).map((subStatus) => subStatus.title),
    )
    .flat()
    .filter((_) => _ !== undefined);

export const getSubStatusListOptions = (
  statusList: string[] | HousingStatus[] | undefined,
) =>
  (statusList ?? [])
    .map((_) => getHousingState(_ as HousingStatus))
    .filter((_) => _.subStatusList)
    .map((housingState) => [
      { value: housingState.title, label: housingState.title, disabled: true },
      ...(housingState.subStatusList ?? []).map((subStatus) => ({
        value: subStatus.title,
        label: subStatus.title,
      })),
    ])
    .flat()
    .filter((_) => _ !== undefined) as SelectOption[];
