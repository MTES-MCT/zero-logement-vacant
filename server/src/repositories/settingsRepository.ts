import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { SettingsApi } from '~/models/SettingsApi';

export const settingsTable = 'settings';
export const Settings = (transaction = db) =>
  transaction<SettingsDBO>(settingsTable);

interface FindOneOptions {
  establishmentId: string;
}

async function findOne(options: FindOneOptions): Promise<SettingsApi | null> {
  logger.info('Get settings', options);

  const settings = await db(settingsTable)
    .where('establishment_id', options.establishmentId)
    .first();
  return settings ? parseSettingsApi(settings) : null;
}

export interface SettingsDBO {
  id: string;
  establishment_id: string;
  inbox_enabled: boolean;
}

async function upsert(settings: SettingsApi): Promise<void> {
  logger.info('Upsert settings', settings);

  await db(settingsTable)
    .insert(formatSettingsApi(settings))
    .onConflict('establishment_id')
    .merge(['inbox_enabled']);
}

export function parseSettingsApi(settings: SettingsDBO): SettingsApi {
  return {
    id: settings.id,
    establishmentId: settings.establishment_id,
    inbox: {
      enabled: settings.inbox_enabled,
    },
  };
}

export function formatSettingsApi(settings: SettingsApi): SettingsDBO {
  return {
    id: settings.id,
    establishment_id: settings.establishmentId,
    inbox_enabled: settings.inbox.enabled,
  };
}

export default {
  findOne,
  upsert,
};
