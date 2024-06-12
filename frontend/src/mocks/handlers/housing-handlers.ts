import { constants } from 'http2';
import fp from 'lodash/fp';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  HousingCountDTO,
  HousingDTO,
  HousingFiltersDTO,
  Paginated
} from '@zerologementvacant/models';
import data from './data';
import config from '../../utils/config';

type HousingParams = {
  id: string;
};

type HousingPayload = {
  filters?: HousingFiltersDTO;
};

export const housingHandlers: RequestHandler[] = [
  http.post<Record<string, never>, HousingPayload, Paginated<HousingDTO>>(
    `${config.apiEndpoint}/api/housing`,
    async ({ request }) => {
      // TODO: use the request payload to filter results
      const payload = await request.json();

      const subset = fp.pipe(
        filterByCampaign(payload.filters?.campaignIds),
        filterByHousingKind(payload.filters?.housingKinds),
        filterByStatus(payload.filters?.status)
      )(data.housings);

      return HttpResponse.json({
        page: 1,
        perPage: 50,
        filteredCount: subset.length,
        totalCount: data.housings.length,
        entities: subset
      });
    }
  ),
  http.post<Record<string, never>, HousingPayload, HousingCountDTO>(
    `${config.apiEndpoint}/api/housing/count`,
    async ({ request }) => {
      const payload = await request.json();

      const subset: HousingDTO[] = fp.pipe(
        filterByCampaign(payload.filters?.campaignIds),
        filterByHousingKind(payload.filters?.housingKinds),
        filterByStatus(payload.filters?.statusList ?? payload.filters?.status)
      )(data.housings);

      const owners: number = fp.uniqBy(
        'id',
        subset.map((housing) => housing.owner)
      ).length;

      return HttpResponse.json({
        housing: subset.length,
        owners: owners
      });
    }
  ),
  http.get<HousingParams, never, HousingDTO | null>(
    `${config.apiEndpoint}/api/housing/:id`,
    ({ params }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      return HttpResponse.json(housing);
    }
  )
];

function filterByCampaign(campaigns?: string[]) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (!campaigns || campaigns.length === 0) {
      return housings;
    }

    return housings.filter((housing) => {
      return data.housingCampaigns
        .get(housing.id)
        ?.some((campaign) => campaigns.includes(campaign.id));
    });
  };
}

function filterByHousingKind(kinds?: string[]) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (!kinds || kinds.length === 0) {
      return housings;
    }

    return housings.filter((housing) => {
      return kinds.includes(housing.kind);
    });
  };
}

function filterByStatus(statuses?: string[]) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (!statuses || statuses.length === 0) {
      return housings;
    }

    return housings.filter((housing) => {
      return statuses.includes(housing.status);
    });
  };
}
