import axios from 'axios';

import config from './infra/config';
import createErrorHandler from './infra/error-handler';
import createTokenProvider from './infra/token-provider';
import { CampaignAPI, createCampaignAPI } from './campaign-api';
import { createDraftAPI, DraftAPI } from './draft-api';
import { createHousingAPI, HousingAPI } from './housing-api';
import { knex } from 'knex';
import { createOwnerAPI, OwnerAPI } from './owner-api';

interface SDK {
  campaign: CampaignAPI;
  draft: DraftAPI;
  housing: HousingAPI;
  owner: OwnerAPI;
}

interface Options {
  db: {
    url: string;
  };
  establishment: string;
  serviceAccount: string;
}

export function createSDK(opts: Options): SDK {
  const db = knex({
    client: 'pg',
    connection: opts.db.url,
  });
  const http = axios.create({
    baseURL: config.api.host,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  http.interceptors.request.use(
    createTokenProvider(opts.establishment, {
      db,
      serviceAccount: opts.serviceAccount,
    }),
  );
  http.interceptors.response.use(undefined, createErrorHandler());

  return {
    campaign: createCampaignAPI(http),
    draft: createDraftAPI(http),
    housing: createHousingAPI(http),
    owner: createOwnerAPI(http),
  };
}
