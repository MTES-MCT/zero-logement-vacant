import config from '../utils/config';
import authService from './auth.service';
import { parseISO } from 'date-fns';
import {
  Campaign,
  CampaignBundle,
  CampaignBundleId,
  campaignBundleIdApiFragment,
  CampaignKinds,
  CampaignSteps,
  DraftCampaign,
} from '../models/Campaign';
import { HousingStatus } from '../models/HousingState';
import { Housing } from '../models/Housing';

const listCampaigns = async (): Promise<Campaign[]> => {
  return await fetch(`${config.apiEndpoint}/api/campaigns`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  })
    .then((_) => _.json())
    .then((_) => _.map((_: any) => parseCampaign(_)));
};

const listCampaignBundles = async (): Promise<CampaignBundle[]> => {
  return await fetch(`${config.apiEndpoint}/api/campaigns/bundles`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  })
    .then((_) => _.json())
    .then((_) => _.map((_: any) => parseCampaignBundle(_)));
};

const getCampaignBundle = async (
  campaignBundleId: CampaignBundleId,
  query?: string
): Promise<CampaignBundle> => {
  return await fetch(
    `${config.apiEndpoint}/api/campaigns/bundles/${campaignBundleIdApiFragment(
      campaignBundleId
    )}${query ? `?q=${query}` : ''}`,
    {
      method: 'GET',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
    }
  )
    .then((_) => _.json())
    .then((_: any) => parseCampaignBundle(_));
};

const createCampaign = async (
  draftCampaign: DraftCampaign,
  allHousing: boolean,
  housingIds?: string[]
): Promise<Campaign> => {
  return await fetch(`${config.apiEndpoint}/api/campaigns/creation`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ draftCampaign, allHousing, housingIds }),
  })
    .then((_) => _.json())
    .then((_) => parseCampaign(_));
};

const updateCampaignBundleTitle = async (
  campaignBundleId: CampaignBundleId,
  title?: string
) => {
  return await fetch(
    `${config.apiEndpoint}/api/campaigns/bundles/${campaignBundleIdApiFragment(
      campaignBundleId
    )}`,
    {
      method: 'PUT',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    }
  );
};

const createCampaignBundleReminder = async (
  campaignBundleId: CampaignBundleId,
  kind: CampaignKinds,
  allHousing: boolean,
  housingIds?: string[]
): Promise<Campaign> => {
  return await fetch(
    `${config.apiEndpoint}/api/campaigns/bundles/${campaignBundleIdApiFragment(
      campaignBundleId
    )}`,
    {
      method: 'POST',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind, allHousing, housingIds }),
    }
  )
    .then((_) => _.json())
    .then((_) => parseCampaign(_));
};

const deleteCampaignBundle = async (
  campaignBundleId: CampaignBundleId
): Promise<void> => {
  return await fetch(
    `${config.apiEndpoint}/api/campaigns/bundles/${campaignBundleIdApiFragment(
      campaignBundleId
    )}`,
    {
      method: 'DELETE',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
    }
  ).then(() => {});
};

export interface ValidateCampaignStepParams {
  sendingDate?: Date;
  // Skip campaign confirmation after filling in the sentAt date
  skipConfirmation?: boolean;
}

const validCampaignStep = async (
  campaignId: string,
  step: CampaignSteps,
  params?: ValidateCampaignStepParams
): Promise<Campaign> => {
  return await fetch(`${config.apiEndpoint}/api/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...params, step }),
  })
    .then((_) => _.json())
    .then((_) => parseCampaign(_));
};

const removeHousingList = async (
  campaignId: string,
  allHousing: boolean,
  housingIds: string[],
  status?: HousingStatus
): Promise<Housing> => {
  return await fetch(
    `${config.apiEndpoint}/api/campaigns/${campaignId}/housing`,
    {
      method: 'DELETE',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ allHousing, housingIds, status }),
    }
  ).then((_) => _.json());
};

const getExportURL = (campaignBundleId: CampaignBundleId) => {
  return `${
    config.apiEndpoint
  }/api/housing/campaigns/bundles/${campaignBundleIdApiFragment(
    campaignBundleId
  )}/export?x-access-token=${authService.authHeader()?.['x-access-token']}`;
};

const parseCampaign = (c: any): Campaign =>
  ({
    ...c,
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined,
    archivedAt: c.archivedAt ? parseISO(c.archivedAt) : undefined,
    sendingDate: c.sendingDate ? parseISO(c.sendingDate) : undefined,
  } as Campaign);

const parseCampaignBundle = (c: any): CampaignBundle =>
  ({
    ...c,
    name: c.campaignNumber ? `C${c.campaignNumber}` : 'Logements hors campagne',
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    exportURL: getExportURL(c as CampaignBundleId),
  } as CampaignBundle);

const campaignService = {
  listCampaigns,
  listCampaignBundles,
  getCampaignBundle,
  createCampaign,
  createCampaignBundleReminder,
  updateCampaignBundleTitle,
  deleteCampaignBundle,
  validCampaignStep,
  removeHousingList,
  getExportURL,
};

export default campaignService;
