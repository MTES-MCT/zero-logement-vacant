import axios from 'axios';
import { knex } from 'knex';

import { createLogger, LogLevel } from '@zerologementvacant/utils';
import createErrorHandler from './infra/error-handler';
import createTokenProvider from './infra/token-provider';
import { CampaignAPI, createCampaignAPI } from './campaign-api';
import { createDraftAPI, DraftAPI } from './draft-api';
import { createHousingAPI, HousingAPI } from './housing-api';
import { createOwnerAPI, OwnerAPI } from './owner-api';

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
  establishment: string;
  log?: {
    level: LogLevel;
  };
  serviceAccount?: string;
}

export function createSDK(opts: Options): SDK {
  const db = knex({
    client: 'pg',
    connection:
      opts.db?.url ?? 'postgres://postgres:postgres@localhost:5432/zlv',
  });
  const logger = createLogger('api-sdk', {
    level: opts.log?.level ?? LogLevel.INFO,
    isProduction: process.env.NODE_ENV === 'production',
  });
  const http = axios.create({
    baseURL: opts.api.host,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  http.interceptors.request.use(
    createTokenProvider(opts.establishment, {
      auth: {
        secret: opts.auth.secret,
      },
      db,
      logger,
      serviceAccount:
        opts.serviceAccount ?? 'admin@zerologementvacant.beta.gouv.fr',
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
