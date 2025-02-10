import { http, HttpResponse, RequestHandler } from 'msw';

import { Precision } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

export const precisionHandlers: RequestHandler[] = [
  // Fetch the referential of precisions
  http.get<never, never, Precision[]>(
    `${config.apiEndpoint}/api/precisions`,
    async () => {
      return HttpResponse.json(data.precisions);
    }
  )
];
