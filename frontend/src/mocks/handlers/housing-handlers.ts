import { constants } from 'http2';
import fp from 'lodash/fp';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  HousingCountDTO,
  HousingDTO,
  HousingFiltersDTO,
  HousingPayloadDTO,
  Paginated
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genOwnerDTO
} from '@zerologementvacant/models/fixtures';
import data from './data';
import config from '../../utils/config';

type HousingParams = {
  id: string;
};

type HousingPayload = {
  filters?: HousingFiltersDTO;
};

export const housingHandlers: RequestHandler[] = [
  http.get<Record<string, never>, HousingPayload, Paginated<HousingDTO>>(
    `${config.apiEndpoint}/api/housing`,
    async ({ request }) => {
      const url = new URL(request.url);
      const queryParams = url.searchParams;
      const filters = queryParams.get('filters')
        ? JSON.parse(queryParams.get('filters') as string)
        : null;

      const subset = fp.pipe(
        filterByCampaign(filters?.campaignIds),
        filterByHousingKind(filters?.housingKinds),
        filterByStatus(filters?.status ? [filters.status] : filters?.statusList)
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
        filterByStatus(
          payload.filters?.status
            ? [payload.filters.status]
            : payload.filters?.statusList
        )
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

  // Add a housing
  http.post<never, HousingPayloadDTO, HousingDTO>(
    `${config.apiEndpoint}/api/housing/creation`,
    async ({ request }) => {
      const payload = await request.json();
      const datafoncierHousing = data.datafoncierHousings.find(
        (datafoncierHousing) => datafoncierHousing.idlocal === payload.localId
      );
      if (!datafoncierHousing) {
        throw HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${payload.localId} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      const owner = genOwnerDTO();
      const housing: HousingDTO = {
        ...genHousingDTO(owner),
        localId: datafoncierHousing.idlocal,
        geoCode: datafoncierHousing.idcom,
        source: 'datafoncier-manual'
      };
      data.housings.push(housing);
      data.owners.push(owner);
      data.housingOwners.set(housing.id, [
        {
          id: owner.id,
          rank: 1,
          locprop: null,
          idprocpte: null,
          idprodroit: null
        }
      ]);
      return HttpResponse.json(housing, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),

  http.get<HousingParams, never, HousingDTO | null>(
    `${config.apiEndpoint}/api/housing/:id`,
    ({ params }) => {
      const housing = data.housings.find((housing) =>
        [housing.id, housing.localId].includes(params.id)
      );
      if (!housing) {
        throw HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${params.id} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      const mainHousingOwner = data.housingOwners
        .get(housing.id)
        ?.find((housingOwner) => housingOwner.rank === 1);
      const owner = data.owners.find(
        (owner) => owner.id === mainHousingOwner?.id
      );
      if (!owner) {
        throw HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }
      return HttpResponse.json({
        ...housing,
        owner: fp.pick(
          [
            'id',
            'rawAddress',
            'fullName',
            'administrator',
            'birthDate',
            'email',
            'phone',
            'banAddress',
            'additionalAddress',
            'kind',
            'kindDetail',
            'createdAt',
            'updatedAt'
          ],
          owner
        )
      });
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
      return kinds.includes(housing.housingKind);
    });
  };
}

function filterByStatus(statuses?: number[]) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (!statuses || statuses.length === 0) {
      return housings;
    }

    return housings.filter((housing) => {
      return statuses.includes(housing.status);
    });
  };
}
