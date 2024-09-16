import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import { EventDTO, HousingDTO } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

export const eventHandlers: RequestHandler[] = [
  http.get<{ id: string }, never, EventDTO<HousingDTO>[]>(
    `${config.apiEndpoint}/api/housing/:id/events`,
    ({ params }) => {
      const housing = data.housings.find((housing) => housing.id === params.id);
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND
        });
      }

      const events = data.housingEvents.get(housing.id) ?? [];
      return HttpResponse.json(events);
    }
  )
];
