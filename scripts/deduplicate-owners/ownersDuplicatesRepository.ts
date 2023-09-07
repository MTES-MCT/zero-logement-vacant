import { OwnerDuplicate } from './OwnerDuplicate';
import {
  formatOwnerApi,
  OwnerDBO,
  ownerTable,
} from '../../server/repositories/ownerRepository';
import db from '../../server/repositories/db';
import { logger } from '../../server/utils/logger';

const ownerDuplicatesTable = 'owners_duplicates';

async function save(...duplicates: OwnerDuplicate[]): Promise<void> {
  const entities = duplicates.map(formatOwnerDuplicate);
  logger.debug(`Saving ${entities.length} owner duplicates...`);
  await db(ownerDuplicatesTable).insert(entities).onConflict('id').ignore();
}

async function removeOrphans(): Promise<void> {
  logger.debug('Removing orphan duplicates...');
  await db(ownerDuplicatesTable)
    .whereNotExists((builder) =>
      builder
        .select('id')
        .from(ownerTable)
        .where('id', db.column(`${ownerDuplicatesTable}.source_id`))
    )
    .delete();
}

export interface OwnerDuplicateDBO extends OwnerDBO {
  source_id: string;
}

export function formatOwnerDuplicate(
  duplicate: OwnerDuplicate
): OwnerDuplicateDBO {
  return {
    ...formatOwnerApi(duplicate),
    source_id: duplicate.sourceId,
  };
}

const ownersDuplicatesRepository = {
  save,
  removeOrphans,
};

export default ownersDuplicatesRepository;
