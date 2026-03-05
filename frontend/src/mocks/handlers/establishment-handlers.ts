import type { EstablishmentDTO } from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';

import config from '../../utils/config';
import data from './data';

const get = http.get<{ id: string }, never, EstablishmentDTO>(
  `${config.apiEndpoint}/api/establishments/:id`,
  async ({ params }) => {
    const establishment = data.establishments.find(
      (establishment) => establishment.id === params.id
    );
    if (!establishment) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(establishment);
  }
);

export const establishmentHandlers: RequestHandler[] = [
  http.get<never, never, ReadonlyArray<EstablishmentDTO>>(
    `${config.apiEndpoint}/api/establishments`,
    async () => {
      const establishments = data.establishments;
      return HttpResponse.json(establishments);
    }
  ),
  get
];
