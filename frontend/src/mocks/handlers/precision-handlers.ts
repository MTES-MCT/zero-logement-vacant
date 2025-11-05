import { http, HttpResponse, RequestHandler } from 'msw';

import type { Precision } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';
import { Predicate } from 'effect';

export const precisionHandlers: RequestHandler[] = [
  // Fetch the referential of precisions
  http.get<never, never, Precision[]>(
    `${config.apiEndpoint}/api/precisions`,
    async () => {
      return HttpResponse.json(data.precisions);
    }
  ),

  // Fetch housing precisions
  http.get<{ id: string }, never, Precision[]>(
    `${config.apiEndpoint}/api/housing/:id/precisions`,
    async ({ params }) => {
      const housingPrecisions = data.housingPrecisions.get(params.id) ?? [];
      const precisions = housingPrecisions
        .map((id) => data.precisions.find((precision) => precision.id === id))
        .filter(Predicate.isNotUndefined);
      return HttpResponse.json(precisions);
    }
  )
];
