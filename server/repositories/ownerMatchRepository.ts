import db from './db';

export const ownerMatchTable = 'owner_matches';
export const OwnerMatches = () => db<OwnerMatchDBO>(ownerMatchTable);

const find = async (): Promise<OwnerMatchDBO[]> => {
  return [];
};

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
  await saveMany([ownerMatch]);
};

const saveMany = async (ownerMatches: OwnerMatchDBO[]): Promise<void> => {
  await OwnerMatches().insert(ownerMatches).onConflict().ignore();
};

export interface OwnerMatchDBO {
  owner_id: string;
  idpersonne: string;
}

const ownerMatchRepository = {
  find,
  findOne,
  save,
  saveMany,
};

export default ownerMatchRepository;
