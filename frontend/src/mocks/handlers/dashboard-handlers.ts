import { http, HttpResponse, RequestHandler } from 'msw';

import type { CardDataDTO, DashboardDTO } from '@zerologementvacant/models';
import {
  genCardDataDTO,
  genDashboardDTO
} from '@zerologementvacant/models/fixtures';
import config from '../../utils/config';

const findOne = http.get<{ id: string }, never, DashboardDTO>(
  `${config.apiEndpoint}/dashboards/:id`,
  () => HttpResponse.json(genDashboardDTO())
);

const findOneCard = http.get<{ did: string; cid: string }, never, CardDataDTO>(
  `${config.apiEndpoint}/dashboards/:did/cards/:cid`,
  ({ params }) =>
    HttpResponse.json(genCardDataDTO({ id: Number(params.cid) }))
);

export const dashboardHandlers: RequestHandler[] = [findOne, findOneCard];
