import { faker } from '@faker-js/faker/locale/fr';
import type {
  HousingCountDTO,
  HousingDTO,
  HousingFiltersDTO,
  HousingPayloadDTO,
  HousingUpdatePayloadDTO,
  Paginated,
  HousingBatchUpdatePayload,
  NoteDTO
} from '@zerologementvacant/models';
import {
  genHousingDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Array, pipe, Struct } from 'effect';
import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';

import config from '../../utils/config';
import data from './data';

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

      const subset = pipe(
        data.housings,
        filterByCampaign(campaignIds),
        filterByHousingKind(housingKinds),
        filterByStatus(statuses)
      );

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

      const subset: HousingDTO[] = pipe(
        data.housings,
        filterByCampaign(campaignIds),
        filterByHousingKind(housingKinds),
        filterByStatus(statuses)
      );

      const owners: number = pipe(
        subset,
        Array.flatMap((housing) => data.housingOwners.get(housing.id) ?? []),
        Array.dedupeWith((a, b) => a.id === b.id),
        Array.length
      );

      return HttpResponse.json({
        housing: subset.length,
        owners: owners
      });
    }
  ),

  // Add a housing
  http.post<never, HousingPayloadDTO, HousingDTO | Error>(
    `${config.apiEndpoint}/api/housing`,
    async ({ request }) => {
      const payload = await request.json();
      const datafoncierHousing = data.datafoncierHousings.find(
        (datafoncierHousing) => datafoncierHousing.idlocal === payload.localId
      );
      if (!datafoncierHousing) {
        return HttpResponse.json(
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
          idprodroit: null,
          propertyRight: null
        }
      ]);
      return HttpResponse.json(housing, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),
  // Bulk update housings
  http.put<never, HousingBatchUpdatePayload, ReadonlyArray<HousingDTO>>(
    `${config.apiEndpoint}/api/housing`,
    async ({ request }) => {
      const payload = await request.json();

      // Get a random user, for now
      const user = faker.helpers.arrayElement(data.users) ?? genUserDTO();
      const housings = pipe(data.housings);

      housings.forEach((housing) => {
        housing.occupancy = payload.occupancy ?? housing.occupancy;
        housing.occupancyIntended =
          payload.occupancyIntended ?? housing.occupancyIntended;
        housing.status = payload.status ?? housing.status;
        housing.subStatus = payload.subStatus ?? housing.subStatus;

        if (payload.note) {
          const note: NoteDTO = {
            id: faker.string.uuid(),
            content: payload.note,
            createdAt: new Date().toJSON(),
            createdBy: user.id,
            creator: user,
            noteKind: 'Note courante',
            updatedAt: null
          };
          data.notes.push(note);
          const notes = (data.housingNotes.get(housing.id) ?? []).concat(
            note.id
          );
          data.housingNotes.set(housing.id, notes);
        }
      });

      return HttpResponse.json(housings);
    }
  ),
  // Get a housing by id
  http.get<HousingParams, never, HousingDTO | null | Error>(
    `${config.apiEndpoint}/api/housing/:id`,
    ({ params }) => {
      const housing = data.housings.find((housing) =>
        [housing.id, housing.localId].includes(params.id)
      );
      if (!housing) {
        return HttpResponse.json(
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
      return HttpResponse.json({
        ...housing,
        owner: !owner
          ? null
          : Struct.pick(
              owner,
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
            )
      });
    }
  ),

  // Update a housing
  http.put<HousingParams, HousingUpdatePayloadDTO, HousingDTO | Error>(
    `${config.apiEndpoint}/api/housing/:id`,
    async ({ params, request }) => {
      const payload = await request.json();
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(
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

export function filterByHousingIds(
  filters: Pick<HousingFiltersDTO, 'all' | 'housingIds'>
) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (filters.all && filters.housingIds?.length) {
      return housings.filter(
        (housing) => !filters.housingIds?.includes(housing.id)
      );
    }

    if (!filters.housingIds?.length) {
      return housings;
    }

    return housings.filter((housing) => {
      return filters.all
        ? !filters.housingIds?.includes(housing.id)
        : filters.housingIds?.includes(housing.id);
    });
  };
}

export function filterByCampaign(campaigns?: Array<string | null>) {
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

export function filterByHousingKind(kinds?: string[]) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (!kinds || kinds.length === 0) {
      return housings;
    }

    return housings.filter((housing) => {
      return kinds.includes(housing.housingKind);
    });
  };
}

export function filterByStatus(statuses?: number[]) {
  return (housings: HousingDTO[]): HousingDTO[] => {
    if (!statuses || statuses.length === 0) {
      return housings;
    }

    return housings.filter((housing) => {
      return statuses.includes(housing.status);
    });
  };
}
