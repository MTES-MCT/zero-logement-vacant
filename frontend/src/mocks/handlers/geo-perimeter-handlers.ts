import type { GeoPerimeterDTO } from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';

import config from '../../utils/config';

export const geoPerimeterHandlers: RequestHandler[] = [
  http.get<Record<string, never>, never, GeoPerimeterDTO[]>(
    `${config.apiEndpoint}/geo/perimeters`,
    async () => {
      return HttpResponse.json([]);
    }
  )
];
