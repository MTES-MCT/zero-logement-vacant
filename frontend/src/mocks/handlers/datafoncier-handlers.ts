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
    async ({ params }) => {
      const housing = data.datafoncierHousings.find(
        (housing) => housing.idlocal === params.localId
      );
      if (!housing) {
        throw HttpResponse.json(
          {
            name: 'HousingMissingError',
            message: `Housing ${params.localId} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND }
        );
      }

      return HttpResponse.json(housing);
    }
  )
];
