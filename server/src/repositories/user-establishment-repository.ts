import type { UserEstablishment } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';

export const USERS_ESTABLISHMENTS_TABLE = 'users_establishments';

export const UsersEstablishments = (transaction = db) =>
  transaction<UserEstablishmentDBO>(USERS_ESTABLISHMENTS_TABLE);

export interface UserEstablishmentDBO {
  user_id: string;
  establishment_id: string;
  establishment_siren: string;
  has_commitment: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

async function getAuthorizedEstablishments(
  userId: string
): Promise<UserEstablishment[]> {
  logger.debug('Get authorized establishments for user', userId);

  const rows = await kysely
    .selectFrom('usersEstablishments')
    .selectAll()
    .where('userId', '=', userId)
    .orderBy('createdAt', 'asc')
    .execute();

  return rows.map(parseUserEstablishmentRow);
}

async function setAuthorizedEstablishments(
  userId: string,
  establishments: Array<{
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }>
): Promise<void> {
  logger.info('Setting authorized establishments for user', {
    userId,
    count: establishments.length
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('usersEstablishments')
      .where('userId', '=', userId)
      .execute();

    if (establishments.length > 0) {
      const now = new Date();
      await trx
        .insertInto('usersEstablishments')
        .values(
          establishments.map((e) => ({
            userId,
            establishmentId: e.establishmentId,
            establishmentSiren: e.establishmentSiren,
            hasCommitment: e.hasCommitment,
            createdAt: now,
            updatedAt: now
          }))
        )
        .execute();
    }
  });
}

async function addAuthorizedEstablishment(
  userId: string,
  establishment: {
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }
): Promise<void> {
  logger.info('Adding authorized establishment for user', {
    userId,
    establishmentId: establishment.establishmentId
  });

  const now = new Date();
  await kysely
    .insertInto('usersEstablishments')
    .values({
      userId,
      establishmentId: establishment.establishmentId,
      establishmentSiren: establishment.establishmentSiren,
      hasCommitment: establishment.hasCommitment,
      createdAt: now,
      updatedAt: now
    })
    .onConflict((oc) =>
      oc.columns(['userId', 'establishmentId']).doUpdateSet((eb) => ({
        hasCommitment: eb.ref('excluded.hasCommitment'),
        updatedAt: eb.ref('excluded.updatedAt')
      }))
    )
    .execute();
}

async function hasAccessToEstablishment(
  userId: string,
  establishmentId: string
): Promise<boolean> {
  const row = await kysely
    .selectFrom('usersEstablishments')
    .select('userId')
    .where('userId', '=', userId)
    .where('establishmentId', '=', establishmentId)
    .executeTakeFirst();

  return !!row;
}

async function isMultiStructure(userId: string): Promise<boolean> {
  const row = await kysely
    .selectFrom('usersEstablishments')
    .select((eb) => eb.fn.countAll().as('count'))
    .where('userId', '=', userId)
    .where('hasCommitment', '=', true)
    .executeTakeFirst();

  return Number(row?.count) > 1;
}

type UserEstablishmentRow = Selectable<DB['usersEstablishments']>;

function parseUserEstablishmentRow(
  row: UserEstablishmentRow
): UserEstablishment {
  return {
    establishmentId: row.establishmentId,
    establishmentSiren: row.establishmentSiren,
    hasCommitment: row.hasCommitment
  };
}

export default {
  getAuthorizedEstablishments,
  setAuthorizedEstablishments,
  addAuthorizedEstablishment,
  hasAccessToEstablishment,
  isMultiStructure
};
