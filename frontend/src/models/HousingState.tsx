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
export const CompletedNotVacant = 'N’était pas vacant';
export const CompletedWithPoorlyInsulatedExit =
  'Sortie de la passoire thermique';
export const CompletedNotPoorlyInsulated = 'N’était pas une passoire thermique';
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
        Le propriétaire <b>n’a pas répondu à la campagne.</b>
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
        Il y a eu <b>un retour ou un échange</b> avec le propriétaire.
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
        La vacance du bien est confirmée et celui-ci fait l’objet d’un 
        <b>projet de travaux</b>, d’une <b>vente en cours</b> ou est 
        <b>accompagné par un partenaire</b> pour une remise sur le marché.
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
        Le propriétaire (ou un acteur de terrain) a indiqué que le bien n’a
        <b>jamais été vacant</b> ou qu’il a été vendu ou loué il y a plus de 2
        ans. Retour traduisant une erreur dans la base de données.
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
    ],
  },
  {
    status: HousingStatus.Blocked,
    title: 'Bloqué',
    hint: (
      <Text spacing="mb-0" as="span">
        La vacance du bien est confirmée mais la <b>situation est complexe</b> 
        et le propriétaire ne semble 
        <b>pas être dans une dynamique de sortie de vacance.</b>
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
        DefaultOption,
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
