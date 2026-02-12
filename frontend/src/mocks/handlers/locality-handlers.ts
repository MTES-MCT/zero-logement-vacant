import { Predicate } from 'effect';
import { http, HttpResponse, type RequestHandler } from 'msw';
import qs from 'qs';

import config from '~/utils/config';
import data from './data';

const find = http.get(
  `${config.apiEndpoint}/api/localities`,
  async ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const query = qs.parse(searchParams.toString());

    const establishment = data.establishments.find(
      (establishment) => establishment.id === query.establishmentId
    );
    if (establishment) {
      return HttpResponse.json(
        establishment.geoCodes
          .map((geoCode) => data.localities.get(geoCode) ?? null)
          .filter(Predicate.isNotNull)
      );
    }

    return HttpResponse.json([...data.localities.values()]);
  }
);

export const localityHandlers: RequestHandler[] = [find];
