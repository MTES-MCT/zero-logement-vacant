import { createHttpService, toJSON } from '../utils/fetchUtils';
import { Settings } from '../../../shared/models/Settings';
import config from '../utils/config';
import authService from './auth.service';
import { DeepPartial } from 'ts-essentials';

const http = createHttpService('settings');

interface FindOneOptions {
  establishmentId: string;
}

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
    .then(toJSON);
}

async function upsert(settings: DeepPartial<Settings>): Promise<void> {
  await http.fetch(
    `${config.apiEndpoint}/api/establishments/${settings.establishmentId}/settings`,
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
