import { faker } from '@faker-js/faker';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import {
  AddressKinds,
  HousingOwnerDTO,
  HousingOwnerPayloadDTO,
  OwnerDTO,
  OwnerPayloadDTO
} from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

interface PathParams {
  id: string;
}

export const ownerHandlers: RequestHandler[] = [
  http.post<never, OwnerPayloadDTO, OwnerDTO>(
    `${config.apiEndpoint}/api/owners/creation`,
    async ({ request }) => {
      const payload = await request.json();

      const owner: OwnerDTO = {
        id: faker.string.uuid(),
        rawAddress: payload.rawAddress,
        fullName: payload.fullName,
        administrator: undefined,
        birthDate: payload.birthDate,
        email: payload.email,
        phone: payload.phone,
        banAddress: payload.banAddress
          ? {
              refId: faker.string.uuid(),
              addressKind: AddressKinds.Owner,
              ...payload.banAddress
            }
          : undefined,
        additionalAddress: payload.additionalAddress,
        createdAt: new Date().toJSON(),
        updatedAt: new Date().toJSON()
      };
      data.owners.push(owner);
      return HttpResponse.json(owner, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  ),

  http.put<PathParams, OwnerPayloadDTO, OwnerDTO>(
    `${config.apiEndpoint}/api/owners/:id`,
    async ({ params, request }) => {
      const payload = await request.json();

      const owner = data.owners.find((owner) => owner.id === params.id);
      if (!owner) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const updated: OwnerDTO = {
        ...owner,
        ...payload,
        banAddress: payload.banAddress
          ? {
              ...payload.banAddress,
              refId: owner.id,
              addressKind: AddressKinds.Owner
            }
          : undefined
      };
      return HttpResponse.json(updated);
    }
  ),

  http.get<PathParams, never, HousingOwnerDTO[]>(
    `${config.apiEndpoint}/api/owners/housing/:id`,
    ({ params }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const housingOwners = data.housingOwners.get(housing.id) || [];
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
          locprop: payload.locprop
        };
      });
      data.housingOwners.set(housing.id, housingOwners);
      return HttpResponse.json(housingOwners, {
        status: constants.HTTP_STATUS_OK
      });
    }
  )
];
