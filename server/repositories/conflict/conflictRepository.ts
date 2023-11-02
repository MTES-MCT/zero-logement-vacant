import db from '../db';
import { ConflictApi, OwnerConflictApi } from '../../models/ConflictApi';
import {
  formatOwnerApi,
  OwnerDBO,
  ownerTable,
  parseOwnerApi,
} from '../ownerRepository';

export const conflictsTable = 'conflicts';
export const ownerConflictsTable = 'conflicts_owners';

export const Conflicts = (transaction = db) =>
  transaction<ConflictDBO>(conflictsTable);
export const OwnerConflicts = (transaction = db) =>
  transaction<OwnerConflictRecordDBO>(ownerConflictsTable);

const owners = {
  async find(): Promise<OwnerConflictApi[]> {
    const conflicts: OwnerConflictDBO[] = await Conflicts()
      .select(`${conflictsTable}.*`)
      .join(
        ownerConflictsTable,
        `${ownerConflictsTable}.conflict_id`,
        `${conflictsTable}.id`
      )
      .select(`${ownerConflictsTable}.*`)
      .join(ownerTable, `${ownerTable}.id`, `${ownerConflictsTable}.owner_id`)
      .select(db.raw(`to_json(${ownerTable}.*) AS existing`))
      .orderBy('id');
    return conflicts.map(parseOwnerConflictApi);
  },
  async save(conflict: OwnerConflictApi): Promise<void> {
    await db.transaction(async (transaction) => {
      await Conflicts(transaction).insert(formatConflictApi(conflict));
      await OwnerConflicts(transaction).insert(
        formatOwnerConflictApi(conflict)
      );
    });
  },
};

export interface ConflictDBO {
  id: string;
  created_at: Date;
}

export const formatConflictApi = (conflict: ConflictApi<any>): ConflictDBO => ({
  id: conflict.id,
  created_at: conflict.createdAt,
});

export interface OwnerConflictRecordDBO {
  conflict_id: string;
  owner_id: string;
  replacement: OwnerDBO;
}

export interface OwnerConflictDBO extends ConflictDBO {
  existing: OwnerDBO;
  replacement: OwnerDBO;
}

export const formatOwnerConflictApi = (
  conflict: OwnerConflictApi
): OwnerConflictRecordDBO => ({
  conflict_id: conflict.id,
  owner_id: conflict.existing.id,
  replacement: formatOwnerApi(conflict.replacement),
});

export const parseOwnerConflictApi = (
  conflict: OwnerConflictDBO
): OwnerConflictApi => ({
  id: conflict.id,
  createdAt: conflict.created_at,
  existing: parseOwnerApi(conflict.existing),
  replacement: parseOwnerApi(conflict.replacement),
});

export default {
  owners,
};
