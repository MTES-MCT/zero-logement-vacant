import { faker } from '@faker-js/faker';
import { constants } from 'http2';
import fp from 'lodash/fp';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  CampaignCreationPayloadDTO,
  CampaignDTO
} from '@zerologementvacant/models';
import data from './data';
import config from '../../utils/config';

type CampaignParams = {
  id: string;
};

export const campaignHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, CampaignDTO[]>(
    `${config.apiEndpoint}/api/campaigns`,
    ({ request }) => {
      const url = new URL(request.url);
      const groups = url.searchParams.get('groups')?.split(',');

      const campaigns = fp.pipe(filter({ groups }))(data.campaigns);
      return HttpResponse.json(campaigns);
    }
  ),
  http.post<Record<string, never>, CampaignCreationPayloadDTO, CampaignDTO>(
    `${config.apiEndpoint}/api/campaigns`,
    async ({ request }) => {
      const payload = await request.json();

      const campaign: CampaignDTO = {
        id: faker.string.uuid(),
        title: payload.title,
        filters: payload.housing.filters,
        status: 'draft',
        createdAt: new Date().toJSON()
      };
      data.campaigns.push(campaign);
      // For now, add random housings to the campaign
      faker.helpers.arrayElements(data.housings).forEach((housing) => {
        data.campaignHousings.add({
          campaignId: campaign.id,
          housingId: housing.id
        });
      });

      return HttpResponse.json(campaign, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  http.post<CampaignParams, CampaignCreationPayloadDTO, CampaignDTO>(
    `${config.apiEndpoint}/api/campaigns/:id/groups`,
    async ({ params, request }) => {
      const payload = await request.json();

      const group = data.groups.find((group) => group.id === params.id);
      if (!group) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const campaign: CampaignDTO = {
        id: faker.string.uuid(),
        title: payload.title,
        filters: {
          groupIds: [group.id]
        },
        status: 'draft',
        createdAt: new Date().toJSON(),
        groupId: group.id
      };
      data.campaigns.push(campaign);
      faker.helpers.arrayElements(data.housings).forEach((housing) => {
        data.campaignHousings.add({
          campaignId: campaign.id,
          housingId: housing.id
        });
      });

      return HttpResponse.json(campaign, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  http.get<CampaignParams, never, CampaignDTO | null>(
    `${config.apiEndpoint}/api/campaigns/:id`,
    ({ params }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id
      );
      if (!campaign) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      return HttpResponse.json(campaign);
    }
  ),
  http.delete<CampaignParams, never, null>(
    `${config.apiEndpoint}/api/campaigns/:id`,
    ({ params }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id
      );
      if (!campaign) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      return HttpResponse.json(null, {
        status: constants.HTTP_STATUS_NO_CONTENT
      });
    }
  )
];

interface FilterOptions {
  groups?: string[];
}

function filter(
  opts: FilterOptions
): (campaigns: CampaignDTO[]) => CampaignDTO[] {
  const { groups } = opts;

  return fp.pipe((campaigns: CampaignDTO[]): CampaignDTO[] =>
    !!groups && groups.length > 0
      ? campaigns.filter(
          (campaign) => campaign.groupId && groups.includes(campaign.groupId)
        )
      : campaigns
  );
}
