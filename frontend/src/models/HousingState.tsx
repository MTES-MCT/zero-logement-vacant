import { DefaultOption, SelectOption } from './SelectOption';
import { Housing } from './Housing';
import { ReactElement } from 'react';
import { Text } from '@dataesr/react-dsfr';

export interface HousingState {
  status: HousingStatus;
  title: string;
  subStatusList?: HousingSubStatus[];
  color?: string;
  bgcolor?: string;
  hint?: ReactElement;
}

export interface HousingSubStatus {
  title: string;
  color: string;
  bgcolor: string;
}

export interface HousingStatusPrecision {
  title: string;
  color: string;
  bgcolor: string;
}

export enum HousingStatus {
  NeverContacted,
  Waiting,
  FirstContact,
  InProgress,
  Completed,
  Blocked,
}

export const FirstContactToContactedSubStatus =
  'Intérêt potentiel / En réflexion';
export const FirstContactWithPreSupportSubStatus = 'En pré-accompagnement';
export const FirstContactNpai = 'NPAI';
export const InProgressWithSupportSubStatus = 'En accompagnement';
export const InProgressWithPublicSupportSubStatus = 'Intervention publique';
export const InProgressWithoutSupportSubStatus =
  'En sortie sans accompagnement';
export const CompletedWithVacancyExit = 'Sortie de la vacance';
export const CompletedNotVacant = "N'était pas vacant";
export const CompletedWithPoorlyInsulatedExit =
  'Sortie de la passoire thermique';
export const CompletedNotPoorlyInsulated = "N'était pas une passoire thermique";
export const OtherObjectiveAchieved = 'Autre objectif rempli';
export const BlockedByOwnerInvoluntary = 'Blocage involontaire du propriétaire';
export const BlockedByOwnerVoluntary = 'Blocage volontaire du propriétaire';
export const BuildingEnvironment = 'Immeuble / Environnement';
export const ThirdPartiesInvolved = 'Tiers en cause';

export const HousingStates: HousingState[] = [
  {
    status: HousingStatus.NeverContacted,
    title: 'Non suivi',
    color: '--beige-gris-galet-sun-407',
    bgcolor: '--beige-gris-galet-moon-821-hover',
  },
  {
    status: HousingStatus.Waiting,
    title: 'En attente de retour',
    hint: (
      <Text spacing="mb-0" as="span">
        Le propriétaire<b> n'a pas répondu au courrier.</b>
      </Text>
    ),
    color: '--blue-ecume-sun-247',
    bgcolor: '--blue-ecume-950',
  },
  {
    status: HousingStatus.FirstContact,
    title: 'Premier contact',
    hint: (
      <Text spacing="mb-0" as="span">
        Phase de qualification de la situation et d'engagement du propriétaire
        pour l'évolution de sa situation.
      </Text>
    ),
    color: '--yellow-tournesol-850-active',
    bgcolor: '--yellow-tournesol-975',
    subStatusList: [
      {
        title: FirstContactToContactedSubStatus,
        color: '--grey-main-525',
        bgcolor: '--yellow-tournesol-975',
      },
      {
        title: FirstContactWithPreSupportSubStatus,
        color: '--grey-main-525',
        bgcolor: '--yellow-tournesol-975',
      },
      {
        title: FirstContactNpai,
        color: '--grey-main-525',
        bgcolor: '--yellow-tournesol-975',
      },
    ],
  },
  {
    status: HousingStatus.InProgress,
    title: 'Suivi en cours',
    hint: (
      <Text spacing="mb-0" as="span">
        La situation du logement est en cours d'évolution (vers une sortie de la
        vacance ou de passoire thermique).
      </Text>
    ),
    color: '--pink-tuile-850-active',
    bgcolor: '--pink-tuile-975',
    subStatusList: [
      {
        title: InProgressWithSupportSubStatus,
        color: '--grey-main-525',
        bgcolor: '--pink-tuile-975',
      },
      {
        title: InProgressWithPublicSupportSubStatus,
        color: '--grey-main-525',
        bgcolor: '--pink-tuile-975',
      },
      {
        title: InProgressWithoutSupportSubStatus,
        color: '--grey-main-525',
        bgcolor: '--pink-tuile-975',
      },
    ],
  },
  {
    status: HousingStatus.Completed,
    title: 'Suivi terminé',
    hint: (
      <Text spacing="mb-0" as="span">
        Le dossier ne nécessite plus de suivi car la situation du logement a
        évolué ou la base de données d'origine comportait une erreur.
      </Text>
    ),
    color: '--green-bourgeon-sun-425',
    bgcolor: '--green-bourgeon-975',
    subStatusList: [
      {
        title: CompletedWithVacancyExit,
        color: '--grey-main-525',
        bgcolor: '--green-bourgeon-975',
      },
      {
        title: CompletedNotVacant,
        color: '--grey-main-525',
        bgcolor: '--green-bourgeon-975',
      },
      {
        title: CompletedWithPoorlyInsulatedExit,
        color: '--grey-main-525',
        bgcolor: '--green-bourgeon-975',
      },
      {
        title: CompletedNotPoorlyInsulated,
        color: '--grey-main-525',
        bgcolor: '--green-bourgeon-975',
      },
      {
        title: OtherObjectiveAchieved,
        color: '--grey-main-525',
        bgcolor: '--green-bourgeon-975',
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
    color: '--purple-glycine-main-494',
    bgcolor: '--purple-glycine-975',
    subStatusList: [
      {
        title: BlockedByOwnerInvoluntary,
        color: '--grey-main-525',
        bgcolor: '--purple-glycine-975',
      },
      {
        title: BlockedByOwnerVoluntary,
        color: '--grey-main-525',
        bgcolor: '--purple-glycine-975',
      },
      {
        title: BuildingEnvironment,
        color: '--grey-main-525',
        bgcolor: '--purple-glycine-975',
      },
      {
        title: ThirdPartiesInvolved,
        color: '--grey-main-525',
        bgcolor: '--purple-glycine-975',
      },
    ],
  },
];

export const getHousingState = (status: HousingStatus) => {
  return HousingStates[status];
};

export const getSubStatus = (
  status: HousingStatus,
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
  statusList: string[] | HousingStatus[] | undefined
) =>
  (statusList ?? [])
    .map((_) => getHousingState(_ as HousingStatus))
    .map((housingState) =>
      (housingState.subStatusList ?? []).map((subStatus) => subStatus.title)
    )
    .flat()
    .filter((_) => _ !== undefined);

export const getSubStatusListOptions = (
  statusList: string[] | HousingStatus[] | undefined
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
