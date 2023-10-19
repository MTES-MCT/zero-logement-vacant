import { HousingFilters } from './HousingFilters';
import { percent } from '../utils/numberUtils';
import { Group } from './Group';

export interface DraftCampaign {
  kind: CampaignKinds;
  filters: HousingFilters;
  title?: string;
}

export interface Campaign {
  id: string;
  campaignNumber: number;
  reminderNumber: number;
  kind: CampaignKinds;
  name: string;
  filters: HousingFilters;
  title?: string;
  createdAt: Date;
  validatedAt?: Date;
  exportedAt?: Date;
  sentAt?: Date;
  archivedAt?: Date;
  sendingDate?: Date;
  confirmedAt?: Date;
}

export interface CampaignBundleId {
  campaignNumber?: number;
  reminderNumber?: number;
}

export interface CampaignBundle extends CampaignBundleId {
  campaignIds: string[];
  createdAt: Date;
  kind: CampaignKinds;
  name: string;
  filters: HousingFilters;
  title?: string;
  housingCount: number;
  neverContactedCount: number;
  waitingCount: number;
  inProgressCount: number;
  notVacantCount: number;
  noActionCount: number;
  npaiCount: number;
  inProgressWithSupportCount: number;
  ownerCount: number;
  exportURL: string;
  group?: Group;
}

export enum CampaignKinds {
  Initial,
  Surveying,
  DoorToDoor,
  BeforeZlv,
}

export const getCampaignKindLabel = (kind: CampaignKinds) => {
  switch (kind) {
    case CampaignKinds.Initial:
      return 'Courrier postal';
    case CampaignKinds.Surveying:
      return 'Arpentage';
    case CampaignKinds.DoorToDoor:
      return 'Porte à porte';
    case CampaignKinds.BeforeZlv:
      return "Dossiers gérés avant l'outil";
  }
};

export enum CampaignSteps {
  OwnersValidation,
  Export,
  Sending,
  Confirmation,
  InProgress,
  Outside,
  Archived,
}

export const CampaignNotSentSteps = [
  CampaignSteps.OwnersValidation,
  CampaignSteps.Export,
  CampaignSteps.Sending,
  CampaignSteps.Confirmation,
];

export function CampaignNumberSort<T extends CampaignBundleId>(c1?: T, c2?: T) {
  return c1?.campaignNumber !== undefined && c2?.campaignNumber !== undefined
    ? c1.campaignNumber === 0
      ? 1
      : c2.campaignNumber === 0
      ? -1
      : c1.campaignNumber < c2.campaignNumber
      ? -1
      : c1.campaignNumber > c2.campaignNumber
      ? 1
      : (c1.reminderNumber ?? 0) - (c2.reminderNumber ?? 0)
    : c1?.campaignNumber
    ? 1
    : c2?.campaignNumber
    ? -1
    : 0;
}

export const getCampaignBundleId = (
  campaignBundle?: CampaignBundle | Campaign
) => {
  if (campaignBundle) {
    return {
      campaignNumber: campaignBundle.campaignNumber,
      reminderNumber: campaignBundle.reminderNumber,
    };
  }
};

export const campaignPartialName = (
  campaignNumber?: number | string,
  reminderNumber?: number | string,
  campaignTitle?: string
) => {
  return campaignNumber === undefined
    ? 'Tous les logements suivis'
    : !campaignNumber
    ? 'Logements hors campagne'
    : [
        campaignTitle ? campaignTitle : `C${Number(campaignNumber)}`,
        (reminderNumber ?? 0) > 0 ? 'Relance n°' + reminderNumber : undefined,
      ]
        .filter((_) => _?.length)
        .join(' - ');
};

export const campaignFullName = (campaign: Campaign | CampaignBundle) => {
  return campaignPartialName(
    campaign.campaignNumber,
    campaign.reminderNumber,
    campaign.title
  );
};

export const campaignStep = (campaign: Campaign) => {
  return campaign?.campaignNumber === 0
    ? CampaignSteps.Outside
    : !campaign?.validatedAt
    ? CampaignSteps.OwnersValidation
    : !campaign?.exportedAt
    ? CampaignSteps.Export
    : !campaign?.sentAt
    ? CampaignSteps.Sending
    : campaign?.archivedAt
    ? CampaignSteps.Archived
    : !campaign?.confirmedAt
    ? CampaignSteps.Confirmation
    : CampaignSteps.InProgress;
};

export const returnRate = (campaignBundle: CampaignBundle) => {
  return campaignBundle.housingCount - campaignBundle.npaiCount !== 0
    ? Math.round(
        100 -
          percent(
            campaignBundle.waitingCount,
            campaignBundle.housingCount - campaignBundle.npaiCount
          )
      )
    : 0;
};

export const campaignBundleIdApiFragment = (
  campaignBundleId: CampaignBundleId
) => {
  return `number${
    (campaignBundleId.campaignNumber ?? -1) >= 0
      ? `/${campaignBundleId.campaignNumber}`
      : ''
  }${
    (campaignBundleId.reminderNumber ?? -1) >= 0
      ? `/${campaignBundleId.reminderNumber}`
      : ''
  }`;
};

export const campaignBundleIdUrlFragment = (
  campaignBundleId?: CampaignBundleId
) => {
  return campaignBundleId
    ? `C${campaignBundleId.campaignNumber ?? ''}${
        (campaignBundleId.reminderNumber ?? -1) >= 0
          ? `/R${campaignBundleId.reminderNumber}`
          : ''
      }`
    : 'C';
};

export function bundleCampaigns(
  campaigns: Campaign[],
  bundle: CampaignBundle
): Campaign[] {
  return campaigns.filter((campaign) =>
    bundle.campaignIds.includes(campaign.id)
  );
}

export function mainCampaign(campaigns: Campaign[]) {
  return (bundle: CampaignBundle): Campaign | null => {
    return bundleCampaigns(campaigns, bundle)[0] ?? null;
  };
}
