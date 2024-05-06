import axios from 'axios';

import { CampaignAPI, createCampaignAPI } from './campaign-api';
import createTokenProvider from './infra/token-provider';
import config from './infra/config';
import createErrorHandler from './infra/error-handler';

interface SDK {
  campaigns: CampaignAPI;
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
    campaigns: createCampaignAPI(http),
  };
}
