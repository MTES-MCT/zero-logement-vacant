import { GroupApi } from '../models/GroupApi';
import db from './db';
import { HousingApi } from '../models/HousingApi';
import { parseUserApi, UserDBO, usersTable } from './userRepository';
import { Knex } from 'knex';
import { logger } from '../utils/logger';
import { housingTable, ownersHousingTable } from './housingRepository';

export const groupsTable = 'groups';
export const groupsHousingTable = 'groups_housing';

export const Groups = (transaction: Knex<GroupDBO> = db) =>
  transaction(groupsTable);
export const GroupsHousing = (transaction: Knex<GroupHousingDBO> = db) =>
  transaction(groupsHousingTable);

interface FindOptions {
  filters: {
    establishmentId: string;
  };
}

const find = async (opts?: FindOptions): Promise<GroupApi[]> => {
  logger.debug('Finding groups...', opts);
  const groups: GroupDBO[] = await Groups()
    .modify(listQuery)
    .modify(filterQuery(opts?.filters));

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
    .where(`${groupsTable}.id`, opts.id)
    .first();
  if (!group) {
    return null;
  }

  logger.debug('Found group', group);
  return group ? parseGroupApi(group) : null;
};

const listQuery = (query: Knex.QueryBuilder): void => {
  query
    .select(`${groupsTable}.*`)
    .join<UserDBO>(usersTable, `${usersTable}.id`, `${groupsTable}.user_id`)
    .select(db.raw(`to_json(${usersTable}.*) AS user`))
    .joinRaw(
      `
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT ${housingTable}.id) AS housing_count,
          COUNT(DISTINCT ${ownersHousingTable}.owner_id) AS owner_count
        FROM ${groupsHousingTable}
        JOIN ${housingTable}
          ON ${housingTable}.geo_code = ${groupsHousingTable}.housing_geo_code
          AND ${housingTable}.id = ${groupsHousingTable}.housing_id
        JOIN ${ownersHousingTable}
          ON ${ownersHousingTable}.housing_geo_code = ${housingTable}.geo_code
          AND ${ownersHousingTable}.housing_id = ${housingTable}.id
          AND ${ownersHousingTable}.rank = 1
        WHERE ${groupsTable}.id = ${groupsHousingTable}.group_id        
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
      query.where(`${groupsTable}.establishment_id`, opts.establishmentId);
    }
  };
};

const save = async (
  group: GroupApi,
  housingList: HousingApi[]
): Promise<void> => {
  logger.debug('Saving group...', {
    group,
    housing: housingList.length,
  });

  await db.transaction(async (transaction) => {
    await Groups(transaction)
      .insert(formatGroupApi(group))
      .onConflict(['id'])
      .merge(['title', 'description']);

    await GroupsHousing(transaction).where({ group_id: group.id }).delete();
    if (housingList.length > 0) {
      await GroupsHousing(transaction).insert(
        formatGroupHousingApi(group, housingList)
      );
    }
  });
  logger.debug('Saved group', group.id);
};

const addHousing = async (
  group: GroupApi,
  housingList: HousingApi[]
): Promise<void> => {
  if (!housingList.length) {
    logger.debug('No housing to add. Skipping...', {
      group,
    });
    return;
  }

  logger.debug('Adding housing to a group...', {
    group,
    housing: housingList.length,
  });

  await GroupsHousing().insert(formatGroupHousingApi(group, housingList));
};

const removeHousing = async (
  group: GroupApi,
  housingList: HousingApi[]
): Promise<void> => {
  logger.debug('Removing housing from a group...', {
    group,
    housing: housingList.length,
  });

  await GroupsHousing()
    .where('group_id', group.id)
    .whereIn(
      'housing_id',
      housingList.map((housing) => housing.id)
    )
    .whereIn(
      'housing_geo_code',
      housingList.map((housing) => housing.geoCode)
    )
    .delete();
};

const archive = async (group: GroupApi): Promise<GroupApi> => {
  logger.debug('Archiving group...', group);
  const archived: GroupApi = {
    ...group,
    archivedAt: new Date(),
  };
  await Groups().where({ id: group.id }).update({
    archived_at: archived.archivedAt,
  });
  return archived;
};

const remove = async (group: GroupApi): Promise<void> => {
  logger.debug('Removing group...', group);
  await Groups().where({ id: group.id }).delete();
  logger.debug('Removed group', group.id);
};

export interface GroupDBO {
  id: string;
  title: string;
  description: string;
  housing_count: string;
  owner_count: string;
  created_at: Date;
  archived_at: Date | null;
  user_id: string;
  user?: UserDBO;
  establishment_id: string;
}

export type GroupCreationDBO = Omit<
  GroupDBO,
  'housing_count' | 'owner_count' | 'user'
>;

export const formatGroupApi = (group: GroupApi): GroupCreationDBO => ({
  id: group.id,
  title: group.title,
  description: group.description,
  created_at: group.createdAt,
  user_id: group.userId,
  establishment_id: group.establishmentId,
  archived_at: null,
});

export const parseGroupApi = (group: GroupDBO): GroupApi => {
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    housingCount: Number(group.housing_count),
    ownerCount: Number(group.owner_count),
    createdAt: group.created_at,
    userId: group.user_id,
    createdBy: group.user ? parseUserApi(group.user) : undefined,
    establishmentId: group.establishment_id,
    archivedAt: group.archived_at,
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
    housing_geo_code: housing.geoCode,
  }));
};

export default {
  find,
  findOne,
  save,
  addHousing,
  removeHousing,
  archive,
  remove,
};
