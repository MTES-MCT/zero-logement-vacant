import axios from 'axios';
import { knex } from 'knex';

import { Logger } from '@zerologementvacant/utils';
import createErrorHandler from './infra/error-handler';
import createTokenProvider from './infra/token-provider';
import { CampaignAPI, createCampaignAPI } from './campaign-api';
import { createDraftAPI, DraftAPI } from './draft-api';
import { createHousingAPI, HousingAPI } from './housing-api';
import { createOwnerAPI, OwnerAPI } from './owner-api';
import { AsyncLocalStorage } from 'node:async_hooks';

interface SDK {
  campaign: CampaignAPI;
  draft: DraftAPI;
  housing: HousingAPI;
  owner: OwnerAPI;
}

interface Options {
  api: {
    host: string;
  };
  auth: {
    secret: string;
  };
  db?: {
    url: string;
  };
  logger: Logger;
  serviceAccount?: string;
  storage: AsyncLocalStorage<{ establishment: string }>;
}

export function createSDK(opts: Options): SDK {
  const db = knex({
    client: 'pg',
    acquireConnectionTimeout: 10_000,
    pool: {
      min: 0,
      max: 10,
    },
    connection:
      opts.db?.url ?? 'postgres://postgres:postgres@localhost:5432/zlv',
  });
  const http = axios.create({
    baseURL: opts.api.host,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  http.interceptors.request.use(
    createTokenProvider({
      auth: {
        secret: opts.auth.secret,
      },
      db,
      logger: opts.logger,
      serviceAccount:
        opts.serviceAccount ?? 'admin@zerologementvacant.beta.gouv.fr',
      storage: opts.storage,
    })
  );
  http.interceptors.response.use(
    undefined,
    createErrorHandler({ logger: opts.logger, })
  );

  return {
    campaign: createCampaignAPI(http),
    draft: createDraftAPI(http),
    housing: createHousingAPI(http),
    owner: createOwnerAPI(http),
  };
}
