import { DeepPartial } from 'ts-essentials';

import { createHttpService, toJSON } from '../utils/fetchUtils';
import config from '../utils/config';
import authService from './auth.service';
import { Settings } from '../models/Settings';

const http = createHttpService('settings');

interface FindOneOptions {
  establishmentId: string;
}

const DEFAULT_SETTINGS: Settings = {
  contactPoints: {
    public: false,
  },
};

async function findOne(options: FindOneOptions): Promise<Settings> {
  return http
    .fetch(
      `${config.apiEndpoint}/api/establishments/${options.establishmentId}/settings`,
      {
        method: 'GET',
        headers: {
          ...authService.authHeader(),
          'Content-Type': 'application/json',
        },
      }
    )
    .then((response) => {
      if (response.status === 404) {
        return DEFAULT_SETTINGS;
      }
      return toJSON(response);
    });
}

async function upsert(
  establishmentId: string,
  settings: DeepPartial<Settings>
): Promise<void> {
  await http.fetch(
    `${config.apiEndpoint}/api/establishments/${establishmentId}/settings`,
    {
      method: 'PUT',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    }
  );
}

const settingsService = {
  findOne,
  upsert,
};

export default settingsService;
