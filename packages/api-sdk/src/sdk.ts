import axios from 'axios';

import config from './infra/config';
import createErrorHandler from './infra/error-handler';
import createTokenProvider from './infra/token-provider';
import { CampaignAPI, createCampaignAPI } from './campaign-api';
import { createDraftAPI, DraftAPI } from './draft-api';
import { createHousingAPI, HousingAPI } from './housing-api';

interface SDK {
  campaign: CampaignAPI;
  draft: DraftAPI;
  housing: HousingAPI;
}

interface Options {
  establishment: string;
}

export function createSDK(opts: Options): SDK {
  const http = axios.create({
    baseURL: config.api.host,
  });
  http.interceptors.request.use(createTokenProvider(opts.establishment));
  http.interceptors.response.use(undefined, createErrorHandler());

  return {
    campaign: createCampaignAPI(http),
    draft: createDraftAPI(http),
    housing: createHousingAPI(http),
  };
}
