import { HousingOwnerConflictApi } from '~/models/ConflictApi';
import db, { where } from '~/infra/database';
import { HousingOwnerDBO } from '../housingOwnerRepository';
import {
  ConflictDBO,
  Conflicts,
  conflictsTable,
  formatConflictApi,
} from './conflictRepository';
import { OwnerDBO, ownerTable, parseHousingOwnerApi } from '../ownerRepository';
import { logger } from '~/infra/logger';

export const housingOwnersConflictsTable = 'conflicts_housing_owners';
export const HousingOwnerConflicts = (transaction = db) =>
  transaction<HousingOwnerConflictRecordDBO>(housingOwnersConflictsTable);

interface HousingOwnerConflictFilters {
  housingGeoCode?: string;
  housingId?: string;
  ownerId?: string;
}

interface FindOptions {
  filters?: HousingOwnerConflictFilters;
}

const find = async (opts?: FindOptions): Promise<HousingOwnerConflictApi[]> => {
  const whereOptions = where<HousingOwnerConflictFilters>([
    'housingGeoCode',
    'housingId',
    'ownerId',
  ]);
  const conflicts = await HousingOwnerConflicts()
    .select(`${housingOwnersConflictsTable}.*`)
    .where(whereOptions(opts))
    .join(
      conflictsTable,
      `${conflictsTable}.id`,
      `${housingOwnersConflictsTable}.conflict_id`,
    )
    .select(`${conflictsTable}.*`)
    .leftJoin(
      { old: ownerTable },
      'old.id',
      `${housingOwnersConflictsTable}.existing_owner_id`,
    )
    .select(db.raw(`to_json(old.*) AS existing`))
    .leftJoin(
      { new: ownerTable },
      'new.id',
      `${housingOwnersConflictsTable}.replacement_owner_id`,
    )
    .select(db.raw(`to_json(new.*) AS replacement`))
    .orderBy('created_at');

  return conflicts.map(parseHousingOwnerConflictApi);
};

const save = async (conflict: HousingOwnerConflictApi): Promise<void> => {
  await db.transaction(async (transaction) => {
    await Conflicts(transaction).insert(formatConflictApi(conflict));
    await HousingOwnerConflicts(transaction).insert(
      formatHousingOwnerConflictApi(conflict),
    );
  });
};

const saveMany = async (
  conflicts: HousingOwnerConflictApi[],
): Promise<void> => {
  if (!conflicts.length) {
    logger.info('The conflicts array is empty. Skipping save...');
    return;
  }
  logger.debug(`Wrote ${conflicts.length} conflicts`);
  await db.transaction(async (transaction) => {
    await Conflicts(transaction).insert(conflicts.map(formatConflictApi));
    await HousingOwnerConflicts(transaction).insert(
      conflicts.map(formatHousingOwnerConflictApi),
    );
  });
};

export interface HousingOwnerConflictRecordDBO {
  conflict_id: string;
  housing_geo_code: string;
  housing_id: string;
  existing_owner_id: string | null;
  replacement_owner_id: string | null;
}

export interface HousingOwnerConflictDBO extends ConflictDBO {
  housing_geo_code: string;
  housing_id: string;
  existing: OwnerDBO & HousingOwnerDBO;
  replacement: OwnerDBO & HousingOwnerDBO;
}

export const formatHousingOwnerConflictApi = (
  conflict: HousingOwnerConflictApi,
): HousingOwnerConflictRecordDBO => ({
  conflict_id: conflict.id,
  housing_geo_code: conflict.housingGeoCode,
  housing_id: conflict.housingId,
  existing_owner_id: conflict.existing?.id ?? null,
  replacement_owner_id: conflict.replacement?.id ?? null,
});

export const parseHousingOwnerConflictApi = (
  conflict: HousingOwnerConflictDBO,
): HousingOwnerConflictApi => ({
  id: conflict.id,
  createdAt: conflict.created_at,
  housingGeoCode: conflict.housing_geo_code,
  housingId: conflict.housing_id,
  existing: parseHousingOwnerApi(conflict.existing),
  replacement: parseHousingOwnerApi(conflict.replacement),
});

export default {
  find,
  save,
  saveMany,
};
