import { http, HttpResponse, RequestHandler } from 'msw';

import type { Precision } from '@zerologementvacant/models';
import { Predicate } from 'effect';
import config from '../../utils/config';
import data from './data';

const replace = http.put<
  { id: string },
  ReadonlyArray<Precision['id']>,
  Precision[]
>(
  `${config.apiEndpoint}/api/housing/:id/precisions`,
  async ({ params, request }) => {
    const housing = data.housings.find((housing) => housing.id === params.id);
    if (!housing) {
      throw HttpResponse.json(
        {
          name: 'HousingMissingError',
          message: `Housing ${params.id} missing`
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const missingPrecisions = body.filter(
      (id) => !data.precisions.some((precision) => precision.id === id)
    );
    if (missingPrecisions.length > 0) {
      throw HttpResponse.json(
        {
          name: 'PrecisionMissingError',
          message: `Precisions ${missingPrecisions.join(', ')} missing`
        },
        { status: 404 }
      );
    }

    data.housingPrecisions.set(params.id, body);
    const precisions = body.map(
      (id) => data.precisions.find((precision) => precision.id === id)!
    );
    return HttpResponse.json(precisions);
  }
);

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
  ),

  replace
];
