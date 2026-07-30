import type { Insertable, Selectable } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';
import { UserPerimeterApi } from '~/models/UserPerimeterApi';

export const userPerimeterTable = 'user_perimeters';
// Knex accessor — re-exported for backward compatibility with seeds and tests.
export const UserPerimeters = (transaction = db) =>
  transaction<UserPerimeterDBO>(userPerimeterTable);

async function upsert(perimeter: UserPerimeterApi): Promise<void> {
  logger.debug('Upsert user perimeter', {
    userId: perimeter.userId,
    establishmentId: perimeter.establishmentId
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('userPerimeters')
      .values(toUserPerimeterInsert(perimeter))
      .onConflict((oc) =>
        oc.columns(['userId', 'establishmentId']).doUpdateSet((eb) => ({
          geoCodes: eb.ref('excluded.geoCodes'),
          departments: eb.ref('excluded.departments'),
          regions: eb.ref('excluded.regions'),
          epci: eb.ref('excluded.epci'),
          frEntiere: eb.ref('excluded.frEntiere'),
          updatedAt: eb.ref('excluded.updatedAt')
        }))
      )
      .execute();
  });
}

async function get(
  userId: string,
  establishmentId: string
): Promise<UserPerimeterApi | null> {
  logger.debug('Get user perimeter', { userId, establishmentId });

  const perimeter = await kysely
    .selectFrom('userPerimeters')
    .selectAll('userPerimeters')
    .where('userId', '=', userId)
    .where('establishmentId', '=', establishmentId)
    .executeTakeFirst();

  return perimeter ? fromUserPerimeterRow(perimeter) : null;
}

async function remove(userId: string, establishmentId?: string): Promise<void> {
  logger.debug('Remove user perimeter', { userId, establishmentId });
  await withinKyselyTransaction(async (trx) => {
    let query = trx.deleteFrom('userPerimeters').where('userId', '=', userId);
    if (establishmentId) {
      query = query.where('establishmentId', '=', establishmentId);
    }
    await query.execute();
  });
}

// Camel-case Insertable mirror of toUserPerimeterDBO for the Kysely write path.
function toUserPerimeterInsert(
  perimeter: UserPerimeterApi
): Insertable<DB['userPerimeters']> {
  return {
    userId: perimeter.userId,
    establishmentId: perimeter.establishmentId,
    geoCodes: perimeter.geoCodes,
    departments: perimeter.departments,
    regions: perimeter.regions,
    epci: perimeter.epci,
    frEntiere: perimeter.frEntiere,
    updatedAt: new Date(perimeter.updatedAt)
  };
}

// Camel-case Kysely mirror of fromUserPerimeterDBO: maps the CamelCasePlugin row
// back to the snake-case DBO so the parsing lives in one place.
function fromUserPerimeterRow(
  row: Selectable<DB['userPerimeters']>
): UserPerimeterApi {
  return fromUserPerimeterDBO({
    user_id: row.userId,
    establishment_id: row.establishmentId,
    geo_codes: row.geoCodes,
    departments: row.departments,
    regions: row.regions,
    epci: row.epci,
    fr_entiere: row.frEntiere,
    updated_at: row.updatedAt
  });
}

export interface UserPerimeterDBO {
  user_id: string;
  establishment_id: string;
  geo_codes: string[];
  departments: string[];
  regions: string[];
  epci: string[];
  fr_entiere: boolean;
  updated_at: Date | string;
}

export const fromUserPerimeterDBO = (
  dbo: UserPerimeterDBO
): UserPerimeterApi => ({
  userId: dbo.user_id,
  establishmentId: dbo.establishment_id,
  geoCodes: dbo.geo_codes || [],
  departments: dbo.departments || [],
  regions: dbo.regions || [],
  epci: dbo.epci || [],
  frEntiere: dbo.fr_entiere,
  updatedAt: new Date(dbo.updated_at).toJSON()
});

export const toUserPerimeterDBO = (
  api: UserPerimeterApi
): UserPerimeterDBO => ({
  user_id: api.userId,
  establishment_id: api.establishmentId,
  geo_codes: api.geoCodes,
  departments: api.departments,
  regions: api.regions,
  epci: api.epci,
  fr_entiere: api.frEntiere,
  updated_at: new Date(api.updatedAt).toJSON()
});

export default {
  upsert,
  get,
  remove
};
