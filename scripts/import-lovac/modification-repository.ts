import { Modification, ModificationKind } from './modification';
import db from '../../server/repositories/db';

const table = 'old_events';

const Modifications = () => db<ModificationDBO>(table);

async function find(options: FindOptions): Promise<Modification[]> {
  const modifications = await Modifications()
    .select()
    .modify((query) => {
      if (options.housingId) {
        query.where('housing_id', options.housingId);
      }
    });
  return modifications.map(parseModification);
}

interface FindOptions {
  id?: string;
  housingId?: string;
}

interface ModificationDBO {
  id: string;
  kind: ModificationKind;
  housingId: string;
}

export function parseModification(modification: ModificationDBO): Modification {
  return {
    id: modification.id,
    kind: modification.kind,
  };
}

export default {
  find,
};
