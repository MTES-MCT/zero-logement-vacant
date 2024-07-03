import { http, HttpResponse, RequestHandler } from 'msw';

import { GeoPerimeterDTO } from '@zerologementvacant/models';
import config from '../../utils/config';

export const geoPerimeterHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, GeoPerimeterDTO[]>(
    `${config.apiEndpoint}/api/geo/perimeters`,
    async () => {
      return HttpResponse.json([]);
    }
  )
];
