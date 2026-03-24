import { faker } from '@faker-js/faker/locale/fr';

import {
  byCreatedAt,
  byHousingCount,
  byOwnerCount,
  byReturnCount,
  byReturnRate,
  bySentAt,
  byStatus,
  byTitle,
  type CampaignCreationPayload,
  type CampaignCreationPayloadDTO,
  type CampaignDTO,
  type CampaignUpdatePayloadDTO,
  type GroupDTO,
  type HousingDTO
} from '@zerologementvacant/models';
import { Array, Order, pipe, Predicate } from 'effect';
import { identity } from 'effect/Function';
import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';
import { toUserDTO } from '~/models/User';
import {
  type CampaignSortable,
  isCampaignSortable
} from '../../models/Campaign';
import config from '../../utils/config';
import { decodeAuth } from './auth-helpers';
import data from './data';

type CampaignParams = {
  id: string;
};

const createFromGroup = http.post<
  { id: GroupDTO['id'] },
  CampaignCreationPayload,
  CampaignDTO
>(
  `${config.apiEndpoint}/api/groups/:id/campaigns`,
  async ({ params, request }) => {
    const group = data.groups.find((group) => group.id === params.id);
    if (!group) {
      throw new HttpResponse(
        {
          name: 'GroupMissingError',
          message: `Group ${params.id} missing`
        },
        {
          status: constants.HTTP_STATUS_NOT_FOUND
        }
      );
    }

    const auth = decodeAuth(request);
    if (!auth) {
      throw new HttpResponse(
        {
          name: 'UnauthorizedError',
          message: 'Unauthorized'
        },
        {
          status: constants.HTTP_STATUS_UNAUTHORIZED
        }
      );
    }

    const payload = await request.json();
    const campaign: CampaignDTO = {
      id: faker.string.uuid(),
      title: payload.title,
      description: payload.description,
      sentAt: payload.sentAt?.slice(0, 'yyyy-mm-dd'.length) ?? null,
      filters: {
        groupIds: [group.id]
      },
      status: 'draft',
      createdAt: new Date().toJSON(),
      createdBy: toUserDTO(auth.user),
      groupId: group.id,
      returnCount: null,
      returnRate: null,
      housingCount: 0,
      ownerCount: 0
    };
    data.campaigns.push(campaign);

    return HttpResponse.json(campaign, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);

export const campaignHandlers: RequestHandler[] = [
  createFromGroup,

  http.get<Record<string, never>, never, CampaignDTO[]>(
    `${config.apiEndpoint}/api/campaigns`,
    ({ request }) => {
      const url = new URL(request.url);
      const groups = url.searchParams.get('groups')?.split(',');
      const order = url.searchParams.get('sort')?.split(',');

      const campaigns = pipe(data.campaigns, filter({ groups }), sort(order));
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
        description: payload.description,
        filters: payload.housing.filters,
        status: 'draft',
        createdAt: new Date().toJSON(),
        createdBy: data.users[0],
        returnCount: null,
        returnRate: null,
        housingCount: 0,
        ownerCount: 0
      };
      data.campaigns.push(campaign);
      // For now, add random housings to the campaign
      const housings = faker.helpers.arrayElements(data.housings);
      data.campaignHousings.set(campaign.id, housings);
      housings.forEach((housing) => {
        data.housingCampaigns.set(
          housing.id,
          data.housingCampaigns.get(housing.id)?.concat(campaign) ?? []
        );
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
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const campaign: CampaignDTO = {
        id: faker.string.uuid(),
        title: payload.title,
        description: payload.description,
        filters: {
          groupIds: [group.id]
        },
        status: 'draft',
        createdAt: new Date().toJSON(),
        createdBy: data.users[0],
        groupId: group.id,
        returnCount: null,
        returnRate: null,
        housingCount: 0,
        ownerCount: 0
      };
      data.campaigns.push(campaign);
      const housings = faker.helpers.arrayElements(data.housings);
      data.campaignHousings.set(campaign.id, housings);
      housings.forEach((housing) => {
        data.housingCampaigns.set(
          housing.id,
          data.housingCampaigns.get(housing.id)?.concat(campaign) ?? []
        );
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
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      return HttpResponse.json(campaign);
    }
  ),
  http.put<CampaignParams, CampaignUpdatePayloadDTO, CampaignDTO>(
    `${config.apiEndpoint}/api/campaigns/:id`,
    async ({ params, request }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id
      );
      if (!campaign) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      const updated: CampaignDTO = {
        ...campaign,
        // TODO
        title: payload.title,
        description: payload.description,
        status: payload.status,
        file: payload.file
      };
      data.campaigns.splice(data.campaigns.indexOf(campaign), 1, updated);
      return HttpResponse.json(updated);
    }
  ),
  http.delete<CampaignParams, never, null>(
    `${config.apiEndpoint}/api/campaigns/:id`,
    ({ params }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id
      );
      if (!campaign) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      data.campaigns = data.campaigns.filter(
        (campaign) => campaign.id !== params.id
      );
      data.campaignDrafts.delete(params.id);
      data.campaignHousings.delete(params.id);
      data.draftCampaigns.forEach((campaign, draftId, map) => {
        if (campaign.id === params.id) {
          map.delete(draftId);
        }
      });
      data.housingCampaigns.forEach((campaigns, housingId, map) => {
        map.set(
          housingId,
          campaigns.filter((campaign) => campaign.id !== params.id)
        );
      });
      return HttpResponse.json(null, {
        status: constants.HTTP_STATUS_NO_CONTENT
      });
    }
  ),
  http.delete<CampaignParams, CampaignCreationPayloadDTO['housing'], null>(
    `${config.apiEndpoint}/api/campaigns/:id/housing`,
    async ({ params, request }) => {
      const campaign = data.campaigns.find(
        (campaign) => campaign.id === params.id
      );
      if (!campaign) {
        throw new HttpResponse(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      const housings =
        data.campaignHousings
          .get(campaign.id)
          ?.map(({ id }) => data.housings.find((housing) => housing.id === id))
          ?.filter(Predicate.isNotUndefined) ?? [];
      const updated: HousingDTO[] = payload.all
        ? housings.filter((housing) => payload.ids.includes(housing.id))
        : housings.filter((housing) => !payload.ids.includes(housing.id));
      const rest = housings.filter((housing) =>
        updated.every((upd) => upd.id !== housing.id)
      );
      data.campaignHousings.set(campaign.id, updated);
      // Remove the housings from the campaign
      rest.forEach((housing) => {
        const campaigns = data.housingCampaigns
          .get(housing.id)
          ?.filter((campaign) => campaign.id !== params.id);
        data.housingCampaigns.set(housing.id, campaigns ?? []);
      });
      data.campaigns = data.campaigns.filter(
        (campaign) => campaign.id !== params.id
      );
      data.campaignHousings.delete(campaign.id);
      data.campaignDrafts.delete(campaign.id);
      data.draftCampaigns.forEach((campaignId, draftId, map) => {
        if (campaignId.id === campaign.id) {
          map.delete(draftId);
        }
      });

      return HttpResponse.json(undefined, {
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

  return !!groups && groups.length > 0
    ? Array.filter<CampaignDTO>(
        (campaign) => !!campaign.groupId && groups.includes(campaign.groupId)
      )
    : identity;
}

function sort(
  keys: ReadonlyArray<string> = []
): (campaigns: CampaignDTO[]) => CampaignDTO[] {
  const ordering: Record<keyof CampaignSortable, Order.Order<CampaignDTO>> = {
    title: byTitle,
    status: byStatus,
    createdAt: byCreatedAt,
    sentAt: bySentAt,
    housingCount: byHousingCount,
    ownerCount: byOwnerCount,
    returnCount: byReturnCount,
    returnRate: byReturnRate
  };

  const sortFn = pipe(
    keys,
    Array.map((key) => {
      const keyWithoutMinus = key.startsWith('-') ? key.slice(1) : key;
      if (!isCampaignSortable(keyWithoutMinus)) {
        return null;
      }
      return key.startsWith('-')
        ? Order.reverse(ordering[keyWithoutMinus])
        : ordering[keyWithoutMinus];
    }),
    Array.filter(Predicate.isNotNull),
    Order.combineAll
  );

  return keys.length > 0 ? Array.sort(sortFn) : identity;
}
