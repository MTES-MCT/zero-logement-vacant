import { EstablishmentDTO } from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';

import config from '../../utils/config.ts';
import data from './data.ts';

export const establishmentHandlers: RequestHandler[] = [
  http.get<never, never, ReadonlyArray<EstablishmentDTO>>(
    `${config.apiEndpoint}/api/establishments`,
    async () => {
      const establishments = data.establishments;
      return HttpResponse.json(establishments);
    }
  )
];
