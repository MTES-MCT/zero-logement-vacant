import { faker } from '@faker-js/faker/locale/fr';
import type {
  HousingOwnerDTO,
  HousingOwnerPayloadDTO,
  OwnerCreationPayload,
  OwnerDTO,
  OwnerUpdatePayload,
  Paginated,
  Pagination
} from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { Array, pipe } from 'effect';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';
import qs from 'qs';

import data from '~/mocks/handlers/data';
import config from '~/utils/config';

interface PathParams {
  id: string;
}

interface SearchPayloadDTO {
  page: number;
  perPage: number;
  q: string;
}

const list = http.get<never, never, ReadonlyArray<OwnerDTO>>(
  `${config.apiEndpoint}/api/owners`,
  ({ request }) => {
    const search = new URL(request.url).search.substring(1);
    const query = schemas.ownerFilters.validateSync(qs.parse(search));

    const owners = pipe(data.owners, (owners) =>
      query.search ? Array.filter(owners, byName(query.search)) : owners
    );

    return HttpResponse.json(owners, {
      status: constants.HTTP_STATUS_OK
    });
  }
);

export const ownerHandlers: RequestHandler[] = [
  list,

  http.post<never, SearchPayloadDTO, Paginated<OwnerDTO>>(
    `${config.apiEndpoint}/api/owners`,
    async ({ request }) => {
      const payload = await request.json();
      const owners = search(payload.q, data.owners, {
        page: payload.page,
        perPage: payload.perPage
      });
      return HttpResponse.json(
        {
          page: payload.page,
          perPage: payload.perPage,
          entities: owners,
          filteredCount: owners.length,
          totalCount: data.owners.length
        },
        {
          status: constants.HTTP_STATUS_PARTIAL_CONTENT
        }
      );
    }
  ),

  http.post<never, OwnerCreationPayload, OwnerDTO>(
    `${config.apiEndpoint}/api/owners/creation`,
    async ({ request }) => {
      const payload = await request.json();

      const owner: OwnerDTO = {
        id: faker.string.uuid(),
        idpersonne: faker.string.alphanumeric(10),
        rawAddress: payload.rawAddress,
        banAddress: null,
        additionalAddress: null,
        fullName: payload.fullName,
        administrator: null,
        kind: 'Particulier',
        kindDetail: null,
        birthDate: payload.birthDate,
        email: payload.email,
        phone: payload.phone,
        siren: null,
        createdAt: new Date().toJSON(),
        updatedAt: new Date().toJSON()
      };
      data.owners.push(owner);
      return HttpResponse.json(owner, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),

  http.put<PathParams, OwnerUpdatePayload, OwnerDTO>(
    `${config.apiEndpoint}/api/owners/:id`,
    async ({ params, request }) => {
      const payload = await request.json();

      const owner = data.owners.find((owner) => owner.id === params.id);
      if (!owner) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      owner.banAddress = payload.banAddress as any;
      owner.fullName = payload.fullName;
      owner.birthDate = payload.birthDate;
      owner.email = payload.email;
      owner.phone = payload.phone;
      owner.additionalAddress = payload.additionalAddress;
      owner.updatedAt = new Date().toJSON();

      return HttpResponse.json(owner);
    }
  ),

  http.get<PathParams, never, ReadonlyArray<HousingOwnerDTO>>(
    `${config.apiEndpoint}/api/housings/:id/owners`,
    ({ params }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const housingOwners: ReadonlyArray<HousingOwnerDTO> =
        data.housingOwners.get(housing.id)?.map((housingOwner) => {
          const owner = data.owners.find(
            (owner) => owner.id === housingOwner.id
          );
          if (!owner) {
            // Should never happen
            throw HttpResponse.json(null, {
              status: constants.HTTP_STATUS_NOT_FOUND
            });
          }
          return { ...housingOwner, ...owner };
        }) ?? [];
      return HttpResponse.json(housingOwners, {
        status: constants.HTTP_STATUS_OK
      });
    }
  ),

  http.put<PathParams, HousingOwnerPayloadDTO[], HousingOwnerDTO[]>(
    `${config.apiEndpoint}/api/housing/:id/owners`,
    async ({ params, request }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const payload = await request.json();
      const housingOwners: HousingOwnerDTO[] = payload.map((payload) => {
        const owner = data.owners.find((owner) => owner.id === payload.id);
        if (!owner) {
          throw HttpResponse.json(null, {
            status: constants.HTTP_STATUS_NOT_FOUND
          });
        }

        return {
          ...owner,
          id: payload.id,
          rank: payload.rank,
          idprocpte: payload.idprocpte,
          idprodroit: payload.idprodroit,
          locprop: payload.locprop,
          propertyRight: payload.propertyRight
        };
      });
      data.housingOwners.set(
        housing.id,
        housingOwners.map(
          ({ id, rank, idprocpte, idprodroit, locprop, propertyRight }) => ({
            id,
            rank,
            idprocpte,
            idprodroit,
            locprop,
            propertyRight
          })
        )
      );
      return HttpResponse.json(housingOwners, {
        status: constants.HTTP_STATUS_OK
      });
    }
  )
];

function byName(name: string) {
  return (owner: OwnerDTO): boolean =>
    owner.fullName.toLowerCase().includes(name.toLowerCase());
}

function paginate(pagination: Pagination) {
  return (owners: ReadonlyArray<OwnerDTO>): ReadonlyArray<OwnerDTO> => {
    const start = (pagination.page - 1) * pagination.perPage;
    const end = start + pagination.perPage;
    return owners.slice(start, end);
  };
}

interface SearchOptions {
  page: number;
  perPage: number;
}

function search(
  query: string,
  owners: ReadonlyArray<OwnerDTO>,
  options: SearchOptions
): ReadonlyArray<OwnerDTO> {
  return pipe(
    owners,
    Array.filter(byName(query)),
    paginate({ page: options.page, perPage: options.perPage })
  );
}
