import { Settings } from '../../shared/models/Settings';
import db from './db';

export const settingsTable = 'settings';

interface FindOneOptions {
  establishmentId: string;
}

async function findOne(options: FindOneOptions): Promise<Settings | null> {
  console.log('Get settings', options);

  const settings = await db(settingsTable)
    .where('establishment_id', options.establishmentId)
    .first();
  return settings ? parseSettingsApi(settings) : null;
}

interface SettingsDBO {
  id: string;
  establishment_id: string;
  contact_points_public: boolean;
}

async function upsert(settings: Settings): Promise<void> {
  console.log('Upsert settings', settings);

  await db(settingsTable)
    .insert(formatSettingsApi(settings))
    .onConflict('establishment_id')
    .merge(['contact_points_public']);
}

function parseSettingsApi(settings: SettingsDBO): Settings {
  return {
    id: settings.id,
    establishmentId: settings.establishment_id,
    contactPoints: {
      public: settings.contact_points_public,
    },
  };
}

function formatSettingsApi(settings: Settings): SettingsDBO {
  return {
    id: settings.id,
    establishment_id: settings.establishmentId,
    contact_points_public: settings.contactPoints.public,
  };
}

export default {
  findOne,
  upsert,
  parseSettingsApi,
  formatSettingsApi,
};
