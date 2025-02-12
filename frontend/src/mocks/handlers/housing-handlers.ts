import { constants } from 'http2';
import fp from 'lodash/fp';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  HousingCountDTO,
  HousingDTO,
  HousingFiltersDTO,
  HousingPayloadDTO,
  HousingUpdatePayloadDTO,
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
      const campaignIds =
        queryParams.get('campaignIds')?.split(',') ?? undefined;
      const housingKinds =
        queryParams.get('housingKinds')?.split(',') ?? undefined;
      const status = queryParams.get('status')
        ? [Number(queryParams.get('status'))]
        : undefined;
      const statuses =
        status ??
        queryParams.get('statusList')?.split(',').map(Number) ??
        undefined;

      const subset = fp.pipe(
        filterByCampaign(campaignIds),
        filterByHousingKind(housingKinds),
        filterByStatus(statuses)
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
  http.get<Record<string, never>, HousingPayload, HousingCountDTO>(
    `${config.apiEndpoint}/api/housing/count`,
    async ({ request }) => {
      const url = new URL(request.url);
      const queryParams = url.searchParams;
      const campaignIds =
        queryParams.get('campaignIds')?.split(',') ?? undefined;
      const housingKinds =
        queryParams.get('housingKinds')?.split(',') ?? undefined;
      const status = queryParams.get('status')
        ? [Number(queryParams.get('status'))]
        : undefined;
      const statuses =
        status ??
        queryParams.get('statusList')?.split(',').map(Number) ??
        undefined;

      const subset: HousingDTO[] = fp.pipe(
        filterByCampaign(campaignIds),
        filterByHousingKind(housingKinds),
        filterByStatus(statuses)
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
    `${config.apiEndpoint}/api/housing`,
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

  // Get a housing by id
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
  ),

  // Update a housing
  http.put<HousingParams, HousingUpdatePayloadDTO, HousingDTO>(
    `${config.apiEndpoint}/api/housing/:id`,
    async ({ params, request }) => {
      const payload = await request.json();
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        throw HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${params.id} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      const updated: HousingDTO = {
        ...housing,
        ...payload
      };
      data.housings = data.housings.map((housing) => {
        return housing.id === updated.id ? updated : housing;
      });

      return HttpResponse.json(updated);
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
