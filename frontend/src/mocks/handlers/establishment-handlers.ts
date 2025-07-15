import { http, HttpResponse, RequestHandler } from 'msw';

import config from '../../utils/config';
import data from './data';

export const establishmentHandlers: RequestHandler[] = [
  http.get(`${config.apiEndpoint}/api/establishments`, () => {
    return HttpResponse.json(data.establishments);
  })
];
