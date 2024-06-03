import { faker } from '@faker-js/faker';
import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  CampaignCreationPayloadDTO,
  CampaignDTO,
} from '@zerologementvacant/models';
import data from './data';
import config from '../../utils/config';

type CampaignParams = {
  id: string;
};

export const campaignHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, CampaignDTO[]>(
    `${config.apiEndpoint}/api/campaigns`,
    () => {
      return HttpResponse.json(data.campaigns);
    },
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
        createdAt: new Date().toJSON(),
      };
      data.campaigns.push(campaign);
      // For now, add random housings to the campaign
      faker.helpers.arrayElements(data.housings).forEach((housing) => {
        data.campaignHousings.add({
          campaignId: campaign.id,
          housingId: housing.id,
        });
      });

      return HttpResponse.json(campaign, {
        status: constants.HTTP_STATUS_CREATED,
      });
    },
  ),
  http.get<CampaignParams, never, CampaignDTO | null>(
    `${config.apiEndpoint}/api/campaigns/:id`,
    ({ params }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id,
      );
      if (!campaign) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND,
        });
      }

      return HttpResponse.json(campaign);
    },
  ),
  http.delete<CampaignParams, never, null>(
    `${config.apiEndpoint}/api/campaigns/:id`,
    ({ params }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id,
      );
      if (!campaign) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND,
        });
      }

      return HttpResponse.json(null, {
        status: constants.HTTP_STATUS_NO_CONTENT,
      });
    },
  ),
];
