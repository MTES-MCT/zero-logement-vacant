import { Knex } from 'knex';
import db from '~/infra/database';
import {
  getTransaction,
  withinTransaction
} from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { housingOwnersTable } from './housingOwnerRepository';
import { housingTable } from './housingRepository';
import { parseUserApi, UserDBO, usersTable } from './userRepository';

export const GROUPS_TABLE = 'groups';
export const GROUPS_HOUSING_TABLE = 'groups_housing';

export const Groups = (transaction: Knex<GroupDBO> = db) =>
  transaction(GROUPS_TABLE);
export const GroupsHousing = (transaction: Knex<GroupHousingDBO> = db) =>
  transaction(GROUPS_HOUSING_TABLE);

interface FindOptions {
  filters: {
    establishmentId: string;
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
}

const findOne = async (opts: FindOneOptions): Promise<GroupApi | null> => {
  logger.debug('Finding group...', opts);
  const group: GroupDBO | undefined = await Groups()
    .modify(listQuery)
    .modify(filterQuery({ establishmentId: opts.establishmentId }))
    .where(`${GROUPS_TABLE}.id`, opts.id)
    .first();
  if (!group) {
    return null;
  }

  logger.debug('Found group', group);
  return group ? parseGroupApi(group) : null;
};

const listQuery = (query: Knex.QueryBuilder): void => {
  query
    .select(`${GROUPS_TABLE}.*`)
    .join<UserDBO>(usersTable, `${usersTable}.id`, `${GROUPS_TABLE}.user_id`)
    .select(db.raw(`to_json(${usersTable}.*) AS user`))
    .joinRaw(
      `
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ${housingTable}.id) AS housing_count,
          COUNT(DISTINCT ${housingOwnersTable}.owner_id) AS owner_count
        FROM ${GROUPS_HOUSING_TABLE}
        JOIN ${housingTable}
          ON ${housingTable}.geo_code = ${GROUPS_HOUSING_TABLE}.housing_geo_code
          AND ${housingTable}.id = ${GROUPS_HOUSING_TABLE}.housing_id
        JOIN ${housingOwnersTable}
          ON ${housingOwnersTable}.housing_geo_code = ${housingTable}.geo_code
          AND ${housingOwnersTable}.housing_id = ${housingTable}.id
          AND ${housingOwnersTable}.rank = 1
        WHERE ${GROUPS_TABLE}.id = ${GROUPS_HOUSING_TABLE}.group_id
      ) counts ON true
    `
    )
    .select(`counts.*`);
};

interface FilterOptions {
  establishmentId?: string;
}

const filterQuery = (opts?: FilterOptions) => {
  return function (query: Knex.QueryBuilder): void {
    if (opts?.establishmentId) {
      query.where(`${GROUPS_TABLE}.establishment_id`, opts.establishmentId);
    }
  };
};

async function save(group: GroupApi, housings?: HousingApi[]): Promise<void> {
  logger.debug('Saving group...', {
    group,
    housing: housings?.length
  });

  const doSave = async (
    transaction: Knex.Transaction,
    group: GroupApi,
    housings?: HousingApi[]
  ): Promise<void> => {
    await Groups(transaction)
      .insert(formatGroupApi(group))
      .onConflict(['id'])
      .merge(['title', 'description', 'exported_at']);

    if (housings) {
      // Replace existing housings from the group
      await GroupsHousing(transaction).where({ group_id: group.id }).delete();
      if (housings.length > 0) {
        await transaction.batchInsert(
          GROUPS_HOUSING_TABLE,
          formatGroupHousingApi(group, housings)
        );
      }
    }
    logger.info('Saved group', {
      group: group.id,
      housings: housings?.length ?? 0
    });
  };

  const transaction = getTransaction();
  if (!transaction) {
    await db.transaction(async (transaction) => {
      await doSave(transaction, group, housings);
    });
  } else {
    await doSave(transaction, group, housings);
  }
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

  await GroupsHousing().insert(formatGroupHousingApi(group, housingList));
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

  await withinTransaction(async (transaction) => {
    await GroupsHousing(transaction)
      .where('group_id', group.id)
      .whereIn(
        ['housing_geo_code', 'housing_id'],
        housingList.map((housing) => [housing.geoCode, housing.id])
      )
      .delete();
  });
};

const archive = async (group: GroupApi): Promise<GroupApi> => {
  logger.debug('Archiving group...', group);

  const archived: GroupApi = {
    ...group,
    archivedAt: new Date()
  };
  await withinTransaction(async (transaction) => {
    await Groups(transaction).where({ id: group.id }).update({
      archived_at: archived.archivedAt
    });
  });
  return archived;
};

const remove = async (group: GroupApi): Promise<void> => {
  logger.debug('Removing group...', group);
  await withinTransaction(async (transaction) => {
    await Groups(transaction).where({ id: group.id }).delete();
  });
  logger.debug('Removed group', group.id);
};

export interface GroupRecordDBO {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  exported_at: Date | null;
  archived_at: Date | null;
  user_id: string;
  establishment_id: string;
}

export interface GroupDBO extends GroupRecordDBO {
  housing_count: string;
  owner_count: string;
  user?: UserDBO;
}

export const formatGroupApi = (group: GroupApi): GroupRecordDBO => ({
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
    housingCount: Number(group.housing_count),
    ownerCount: Number(group.owner_count),
    createdAt: group.created_at,
    exportedAt: group.exported_at,
    userId: group.user_id,
    createdBy: group.user ? parseUserApi(group.user) : undefined,
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
