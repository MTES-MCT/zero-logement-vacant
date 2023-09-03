import { OwnerDuplicate } from './OwnerDuplicate';
import {
  formatOwnerApi,
  OwnerDBO,
} from '../../server/repositories/ownerRepository';
import db from '../../server/repositories/db';

const ownerDuplicatesTable = 'owners_duplicates';

async function save(...duplicates: OwnerDuplicate[]): Promise<void> {
  const entities = duplicates.map(formatOwnerDuplicate);
  await db(ownerDuplicatesTable).insert(entities).onConflict('id').ignore();
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
};

export default ownersDuplicatesRepository;
