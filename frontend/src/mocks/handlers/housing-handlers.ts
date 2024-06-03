import { constants } from 'http2';
import fp from 'lodash/fp';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  HousingCountDTO,
  HousingDTO,
  HousingFiltersDTO
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
  http.post<Record<string, never>, HousingPayload, HousingDTO[]>(
    `${config.apiEndpoint}/api/housing`,
    async () => {
      return HttpResponse.json(data.housings);
    }
  ),
  http.post<Record<string, never>, HousingPayload, HousingCountDTO>(
    `${config.apiEndpoint}/api/housing/count`,
    async () => {
      const housings: number = data.housings.length;
      const owners: number = fp.uniqBy(
        'id',
        data.housings.map((housing) => housing.owner)
      ).length;

      return HttpResponse.json({
        housing: housings,
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
