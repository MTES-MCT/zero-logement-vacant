import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import { DatafoncierHousing } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

interface DatafoncierHousingParams {
  localId: string;
}

export const datafoncierHandlers: RequestHandler[] = [
  http.get<DatafoncierHousingParams, never, DatafoncierHousing>(
    `${config.apiEndpoint}/api/datafoncier/housing/:localId`,
    async ({ params, }) => {
      const housing = data.datafoncierHousings.find(
        (housing) => housing.idlocal === params.localId
      );
      if (!housing) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_NOT_FOUND,
        });
      }

      return HttpResponse.json(housing);
    }
  )
];
