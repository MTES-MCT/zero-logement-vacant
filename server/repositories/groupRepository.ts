import { GroupApi } from '../models/GroupApi';
import db from './db';
import { HousingApi } from '../models/HousingApi';
import { parseUserApi, UserDBO, usersTable } from './userRepository';
import { Knex } from 'knex';
import UserMissingError from '../errors/userMissingError';
import { logger } from '../utils/logger';

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
    .select(db.raw(`to_json(${usersTable}.*) AS user`));
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
    housingList: housingList,
  });

  await db.transaction(async (transaction) => {
    await Groups(transaction)
      .insert(formatGroupApi(group))
      .onConflict(['id'])
      .merge(['title', 'description', 'housing_count', 'owner_count']);

    await GroupsHousing(transaction).where({ group_id: group.id }).delete();
    await GroupsHousing(transaction).insert(
      formatGroupHousingApi(group, housingList)
    );
  });
  logger.debug('Saved group', group.id);
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
  housing_count: number;
  owner_count: number;
  created_at: Date;
  user_id: string;
  user?: UserDBO;
  establishment_id: string;
}

export const formatGroupApi = (group: GroupApi): GroupDBO => ({
  id: group.id,
  title: group.title,
  description: group.description,
  housing_count: group.housingCount,
  owner_count: group.ownerCount,
  created_at: group.createdAt,
  user_id: group.userId,
  establishment_id: group.establishmentId,
});

export const parseGroupApi = (group: GroupDBO): GroupApi => {
  if (!group.user) {
    throw new UserMissingError(group.user_id);
  }

  return {
    id: group.id,
    title: group.title,
    description: group.description,
    housingCount: group.housing_count,
    ownerCount: group.owner_count,
    createdAt: new Date(group.created_at),
    userId: group.user_id,
    createdBy: parseUserApi(group.user),
    establishmentId: group.establishment_id,
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
  remove,
};
