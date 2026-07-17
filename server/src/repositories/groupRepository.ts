import { Array } from 'effect';
import { Knex } from 'knex';
import type { Insertable } from 'kysely';
import pMap from 'p-map';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { logger } from '~/infra/logger';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';

import { fromUserDBO, UserDBO, USERS_TABLE } from './userRepository';

export const GROUPS_TABLE = 'groups';
export const GROUPS_HOUSING_TABLE = 'groups_housing';

// Matches Knex's batchInsert default chunk size, which the Kysely insert
// below must replicate manually to stay under Postgres's 65535 bind-parameter limit.
const INSERT_BATCH_SIZE = 1000;

export const Groups = (transaction: Knex<GroupDBO> = db) =>
  transaction(GROUPS_TABLE);
export const GroupsHousing = (transaction: Knex<GroupHousingDBO> = db) =>
  transaction(GROUPS_HOUSING_TABLE);

interface FindOptions {
  filters: {
    establishmentId: string;
    /**
     * If provided, only return groups where ALL housings are within these geoCodes.
     * Groups with any housing outside these geoCodes will be excluded.
     */
    geoCodes?: string[];
  };
}

const find = async (opts?: FindOptions): Promise<GroupApi[]> => {
  logger.debug('Finding groups...', opts);
  const groups: GroupDBO[] = await Groups()
    .modify(listQuery)
    .modify(filterQuery(opts?.filters))
    .orderBy('created_at', 'desc');

  logger.debug('Found groups', groups.length);
  return groups.map(parseGroupApi);
};

interface FindOneOptions {
  id: string;
  establishmentId: string;
  geoCodes?: string[];
}

const findOne = async (opts: FindOneOptions): Promise<GroupApi | null> => {
  logger.debug('Finding group...', opts);
  const group: GroupDBO | undefined = await Groups()
    .modify(listQuery)
    .modify(
      filterQuery({
        establishmentId: opts.establishmentId,
        geoCodes: opts.geoCodes
      })
    )
    .where(`${GROUPS_TABLE}.id`, opts.id)
    .first();
  if (!group) {
    return null;
  }

  logger.debug('Found group', group);
  return group ? parseGroupApi(group) : null;
};

// After — housing_count and owner_count are now plain columns on groups,
// selected automatically via groups.*
const listQuery = (query: Knex.QueryBuilder): void => {
  query
    .select(`${GROUPS_TABLE}.*`)
    .join<UserDBO>(USERS_TABLE, `${USERS_TABLE}.id`, `${GROUPS_TABLE}.user_id`)
    .select(db.raw(`to_json(${USERS_TABLE}.*) AS user`));
};

interface FilterOptions {
  establishmentId?: string;
  /**
   * If provided, only return groups where ALL housings are within these geoCodes.
   * Groups with any housing outside these geoCodes will be excluded.
   */
  geoCodes?: string[];
}

const filterQuery = (opts?: FilterOptions) => {
  return function (query: Knex.QueryBuilder): void {
    if (opts?.establishmentId) {
      query.where(`${GROUPS_TABLE}.establishment_id`, opts.establishmentId);
    }
    // Filter groups to only those where ALL housings are within the user's perimeter
    // Note: geoCodes is an array when a restriction applies
    //   - non-empty array: filter to groups with housings in these geoCodes
    //   - empty array: user should see NO groups (intersection with perimeter is empty)
    if (opts?.geoCodes !== undefined) {
      if (opts.geoCodes.length === 0) {
        // Empty geoCodes means no access - return no groups
        query.whereRaw('1 = 0');
      } else {
        const geoCodes = opts.geoCodes;
        query.whereNotExists(function () {
          this.select(db.raw('1'))
            .from(GROUPS_HOUSING_TABLE)
            .whereRaw(`${GROUPS_HOUSING_TABLE}.group_id = ${GROUPS_TABLE}.id`)
            .whereRaw(
              `${GROUPS_HOUSING_TABLE}.housing_geo_code NOT IN (${geoCodes.map(() => '?').join(', ')})`,
              geoCodes
            );
        });
      }
    }
  };
};

async function save(group: GroupApi, housings?: HousingApi[]): Promise<void> {
  logger.debug('Saving group...', {
    group,
    housing: housings?.length
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('groups')
      .values(toGroupDBO(group))
      .onConflict((oc) =>
        oc.column('id').doUpdateSet((eb) => ({
          title: eb.ref('excluded.title'),
          description: eb.ref('excluded.description'),
          exportedAt: eb.ref('excluded.exportedAt')
        }))
      )
      .execute();

    if (housings) {
      // Replace existing housings from the group
      await trx
        .deleteFrom('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      if (housings.length > 0) {
        await pMap(
          Array.chunksOf(housings, INSERT_BATCH_SIZE),
          async (batch) => {
            await trx
              .insertInto('groupsHousing')
              .values(toGroupHousingDBOs(group, batch))
              .execute();
          },
          { concurrency: 1 }
        );
      }
    }
    logger.info('Saved group', {
      group: group.id,
      housings: housings?.length ?? 0
    });
  });
}

const addHousing = async (
  group: GroupApi,
  housingList: HousingApi[]
): Promise<void> => {
  if (!housingList.length) {
    logger.debug('No housing to add. Skipping...', {
      group
    });
    return;
  }

  logger.debug('Adding housing to a group...', {
    group,
    housing: housingList.length
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('groupsHousing')
      .values(toGroupHousingDBOs(group, housingList))
      .execute();
  });
  logger.info(`Added housing to a group.`, {
    group,
    housing: housingList.length
  });
};

const removeHousing = async (
  group: GroupApi,
  housingList: HousingApi[]
): Promise<void> => {
  logger.debug('Removing housing from a group...', {
    group,
    housing: housingList.length
  });

  if (housingList.length === 0) {
    return;
  }

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('groupsHousing')
      .where('groupId', '=', group.id)
      .where((eb) =>
        eb(
          eb.refTuple('housingGeoCode', 'housingId'),
          'in',
          housingList.map((housing) => eb.tuple(housing.geoCode, housing.id))
        )
      )
      .execute();
  });
};

const archive = async (group: GroupApi): Promise<GroupApi> => {
  logger.debug('Archiving group...', group);

  const archived: GroupApi = {
    ...group,
    archivedAt: new Date()
  };
  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('groups')
      .set({ archivedAt: archived.archivedAt })
      .where('id', '=', group.id)
      .execute();
  });
  return archived;
};

const remove = async (group: GroupApi): Promise<void> => {
  logger.debug('Removing group...', group);
  await withinKyselyTransaction(async (trx) => {
    await trx.deleteFrom('groups').where('id', '=', group.id).execute();
  });
  logger.debug('Removed group', group.id);
};

function toGroupDBO(group: GroupApi): Insertable<DB['groups']> {
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    createdAt: group.createdAt,
    exportedAt: group.exportedAt,
    userId: group.userId,
    establishmentId: group.establishmentId,
    archivedAt: group.archivedAt
  };
}

function toGroupHousingDBOs(
  group: GroupApi,
  housingList: HousingApi[]
): Insertable<DB['groupsHousing']>[] {
  return housingList.map((housing) => ({
    groupId: group.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  }));
}

export interface GroupRecordDBO {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  exported_at: Date | null;
  archived_at: Date | null;
  user_id: string;
  establishment_id: string;
  housing_count: number;
  owner_count: number;
}

export interface GroupDBO extends GroupRecordDBO {
  user?: UserDBO;
}

export const formatGroupApi = (
  group: GroupApi
): Omit<GroupRecordDBO, 'housing_count' | 'owner_count'> => ({
  id: group.id,
  title: group.title,
  description: group.description,
  created_at: group.createdAt,
  exported_at: group.exportedAt,
  user_id: group.userId,
  establishment_id: group.establishmentId,
  archived_at: group.archivedAt
});

export const parseGroupApi = (group: GroupDBO): GroupApi => {
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    housingCount: group.housing_count,
    ownerCount: group.owner_count,
    createdAt: group.created_at,
    exportedAt: group.exported_at,
    userId: group.user_id,
    createdBy: group.user ? fromUserDBO(group.user) : undefined,
    establishmentId: group.establishment_id,
    archivedAt: group.archived_at
  };
};

export interface GroupHousingDBO {
  group_id: string;
  housing_id: string;
  housing_geo_code: string;
}

export const formatGroupHousingApi = (
  group: GroupApi,
  housingList: HousingApi[]
): GroupHousingDBO[] => {
  return housingList.map((housing) => ({
    group_id: group.id,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode
  }));
};

export default {
  find,
  findOne,
  save,
  addHousing,
  removeHousing,
  archive,
  remove
};
