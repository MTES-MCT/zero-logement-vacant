import type { Insertable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';
import { ProspectApi } from '~/models/ProspectApi';

export const prospectsTable = 'prospects';
// Knex accessor — re-exported for backward compatibility with seeds and tests.
export const Prospects = (transaction = db) =>
  transaction<ProspectDBO>(prospectsTable);

async function get(email: string): Promise<ProspectApi | null> {
  logger.info('Get prospect by email', email);

  const prospect = await kysely
    .selectFrom('prospects')
    // Unoptimized because siren is not a foreign key
    // but still more performant than listing all the establishments
    .leftJoin('establishments as e', 'e.siren', 'prospects.establishmentSiren')
    .select([
      'prospects.email',
      'prospects.hasAccount',
      'prospects.hasCommitment',
      'prospects.lastAccountRequestAt',
      'e.id as establishmentId',
      'e.siren as establishmentSiren'
    ])
    .where('prospects.email', '=', email)
    .executeTakeFirst();

  return prospect ? parseProspectRow(prospect) : null;
}

async function exists(email: string): Promise<boolean> {
  logger.debug(`Does prospect ${email} exist`);

  const prospect = await kysely
    .selectFrom('prospects')
    .select('email')
    .where('email', '=', email)
    .executeTakeFirst();

  return !!prospect;
}

async function upsert(prospect: ProspectApi): Promise<void> {
  logger.info('Upsert prospect with email', prospect.email);
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('prospects')
      .values(toProspectInsert(prospect))
      .onConflict((oc) =>
        oc.column('email').doUpdateSet((eb) => ({
          hasAccount: eb.ref('excluded.hasAccount'),
          hasCommitment: eb.ref('excluded.hasCommitment'),
          lastAccountRequestAt: eb.ref('excluded.lastAccountRequestAt'),
          establishmentSiren: eb.ref('excluded.establishmentSiren')
        }))
      )
      .execute();
  });
}

async function remove(email: string): Promise<void> {
  logger.info('Remove prospect with email', email);
  await withinKyselyTransaction(async (trx) => {
    await trx.deleteFrom('prospects').where('email', '=', email).execute();
  });
}

export interface ProspectRecordDBO {
  email: string;
  establishment_siren?: number;
  has_account: boolean;
  has_commitment: boolean;
  last_account_request_at: Date;
}

export interface ProspectDBO extends ProspectRecordDBO {
  establishment_id: string;
  campaign_intent: string;
}

export const parseProspectApi = (prospect: ProspectDBO): ProspectApi => ({
  email: prospect.email,
  hasAccount: prospect.has_account,
  hasCommitment: prospect.has_commitment,
  lastAccountRequestAt: prospect.last_account_request_at,
  establishment: {
    id: prospect.establishment_id,
    siren: prospect.establishment_siren?.toString() ?? ''
  }
});

export const formatProspectApi = (
  prospect: ProspectApi
): ProspectRecordDBO => ({
  email: prospect.email,
  has_account: prospect.hasAccount,
  has_commitment: prospect.hasCommitment,
  last_account_request_at: prospect.lastAccountRequestAt,
  establishment_siren: prospect.establishment?.siren
    ? Number(prospect.establishment.siren)
    : undefined
});

// Camel-case Insertable mirror of formatProspectApi for the Kysely write path.
function toProspectInsert(prospect: ProspectApi): Insertable<DB['prospects']> {
  return {
    email: prospect.email,
    hasAccount: prospect.hasAccount,
    hasCommitment: prospect.hasCommitment,
    lastAccountRequestAt: prospect.lastAccountRequestAt,
    establishmentSiren: prospect.establishment?.siren
      ? Number(prospect.establishment.siren)
      : null
  };
}

// Camel-case Kysely mirror of parseProspectApi: reads the CamelCasePlugin row
// (establishment fields come from the left join, so they may be null).
function parseProspectRow(row: {
  email: string;
  hasAccount: boolean;
  hasCommitment: boolean;
  lastAccountRequestAt: Date | string;
  establishmentId: string | null;
  establishmentSiren: number | null;
}): ProspectApi {
  return {
    email: row.email,
    hasAccount: row.hasAccount,
    hasCommitment: row.hasCommitment,
    lastAccountRequestAt: new Date(row.lastAccountRequestAt),
    establishment: {
      id: row.establishmentId as string,
      siren: row.establishmentSiren?.toString() ?? ''
    }
  };
}

export default {
  get,
  exists,
  upsert,
  remove,
  formatProspectApi,
  parseProspectApi
};
