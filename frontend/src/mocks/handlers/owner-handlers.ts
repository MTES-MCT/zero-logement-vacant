import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import {
  AddressKinds,
  OwnerDTO,
  OwnerPayloadDTO
} from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

interface OwnerParams {
  id: string;
}

export const ownerHandlers: RequestHandler[] = [
  http.put<OwnerParams, OwnerPayloadDTO, OwnerDTO>(
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
  )
];
