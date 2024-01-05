import db from './db';
import { logger } from '../utils/logger';

export const ownerMatchTable = 'owner_matches';
export const OwnerMatches = () => db<OwnerMatchDBO>(ownerMatchTable);

interface FindOneOptions {
  idpersonne: string;
}

const findOne = async (opts: FindOneOptions): Promise<OwnerMatchDBO | null> => {
  const match = await OwnerMatches()
    .where('idpersonne', opts.idpersonne)
    .first();

  if (!match) {
    return null;
  }
  logger.debug('Found owner match', match);
  return match;
};

const save = async (ownerMatch: OwnerMatchDBO): Promise<void> => {
  await saveMany([ownerMatch]);
};

const saveMany = async (ownerMatches: OwnerMatchDBO[]): Promise<void> => {
  logger.debug(`Saving ${ownerMatches.length} owner matches...`);
  await OwnerMatches().insert(ownerMatches).onConflict().ignore();
};

export interface OwnerMatchDBO {
  owner_id: string;
  idpersonne: string;
}

const ownerMatchRepository = {
  findOne,
  save,
  saveMany,
};

export default ownerMatchRepository;
