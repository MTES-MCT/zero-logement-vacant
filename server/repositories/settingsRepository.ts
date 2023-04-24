import db from './db';
import { SettingsApi } from '../models/SettingsApi';

export const settingsTable = 'settings';

interface FindOneOptions {
  establishmentId: string;
}

async function findOne(options: FindOneOptions): Promise<SettingsApi | null> {
  console.log('Get settings', options);

  const settings = await db(settingsTable)
    .where('establishment_id', options.establishmentId)
    .first();
  return settings ? parseSettingsApi(settings) : null;
}

export interface SettingsDBO {
  id: string;
  establishment_id: string;
  contact_points_public: boolean;
  inbox_enabled: boolean;
}

async function upsert(settings: SettingsApi): Promise<void> {
  console.log('Upsert settings', settings);

  await db(settingsTable)
    .insert(formatSettingsApi(settings))
    .onConflict('establishment_id')
    .merge(['contact_points_public']);
}

function parseSettingsApi(settings: SettingsDBO): SettingsApi {
  return {
    id: settings.id,
    establishmentId: settings.establishment_id,
    contactPoints: {
      public: settings.contact_points_public,
    },
    inbox: {
      enabled: settings.inbox_enabled,
    },
  };
}

function formatSettingsApi(settings: SettingsApi): SettingsDBO {
  return {
    id: settings.id,
    establishment_id: settings.establishmentId,
    contact_points_public: settings.contactPoints.public,
    inbox_enabled: settings.inbox.enabled,
  };
}

export default {
  findOne,
  upsert,
  parseSettingsApi,
  formatSettingsApi,
};
