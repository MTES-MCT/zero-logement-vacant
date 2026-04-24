import type { Insertable, Selectable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { logger } from '~/infra/logger';
import { SettingsApi } from '~/models/SettingsApi';

export const settingsTable = 'settings';

// Knex accessor kept for backward compatibility (seed files, controller tests)
export interface SettingsDBO {
  id: string;
  establishment_id: string;
  inbox_enabled: boolean;
}

export const Settings = (transaction = db) =>
  transaction<SettingsDBO>(settingsTable);

// Kysely row type
type SettingsRow = Selectable<DB['settings']>;

interface FindOneOptions {
  establishmentId: string;
}

async function findOne(options: FindOneOptions): Promise<SettingsApi | null> {
  logger.info('Get settings', options);

  const row = await kysely
    .selectFrom('settings')
    .where('establishmentId', '=', options.establishmentId)
    .selectAll()
    .executeTakeFirst();

  return row ? parseSettingsApi(row) : null;
}

async function upsert(settings: SettingsApi): Promise<void> {
  logger.info('Upsert settings', settings);

  await kysely
    .insertInto('settings')
    .values(toKyselyInsertable(settings))
    .onConflict((oc) =>
      oc
        .column('establishmentId')
        .doUpdateSet({ inboxEnabled: settings.inbox.enabled })
    )
    .execute();
}

export function parseSettingsApi(row: SettingsRow): SettingsApi {
  return {
    id: row.id,
    establishmentId: row.establishmentId ?? '',
    inbox: { enabled: row.inboxEnabled ?? false }
  };
}

// Returns snake_case DBO for Knex-based callers (seed files, controller tests)
export function formatSettingsApi(settings: SettingsApi): SettingsDBO {
  return {
    id: settings.id,
    establishment_id: settings.establishmentId,
    inbox_enabled: settings.inbox.enabled
  };
}

// Internal Kysely insert format (camelCase)
function toKyselyInsertable(settings: SettingsApi): Insertable<DB['settings']> {
  return {
    id: settings.id,
    establishmentId: settings.establishmentId,
    inboxEnabled: settings.inbox.enabled
  };
}

export default {
  findOne,
  upsert
};
