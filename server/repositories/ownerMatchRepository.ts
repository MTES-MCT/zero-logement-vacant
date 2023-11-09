import db from './db';

export const ownerMatchTable = 'owner_matches';
export const OwnerMatches = () => db<OwnerMatchDBO>(ownerMatchTable);

interface FindOneOptions {
  idpersonne: string;
}

const findOne = async (opts: FindOneOptions): Promise<OwnerMatchDBO | null> => {
  const match = await OwnerMatches()
    .where('idpersonne', opts.idpersonne)
    .first();
  return match ?? null;
};

const save = async (ownerMatch: OwnerMatchDBO): Promise<void> => {
  await OwnerMatches().insert(ownerMatch).onConflict().ignore();
};

export interface OwnerMatchDBO {
  owner_id: string;
  idpersonne: string;
}

const ownerMatchRepository = {
  findOne,
  save,
};

export default ownerMatchRepository;
