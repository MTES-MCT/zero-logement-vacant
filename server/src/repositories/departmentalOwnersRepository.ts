import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import db from '~/infra/database';

export const departmentalOwnersTable = 'owners_dept';
export const DepartmentalOwners = (transaction = db) =>
  transaction<DepartmentalOwnerDBO>(departmentalOwnersTable);

export interface DepartmentalOwnerDBO {
  owner_id: string;
  owner_idpersonne: string;
}

function stream(): ReadableStream<DepartmentalOwnerDBO> {
  const query = DepartmentalOwners()
    .select(`${departmentalOwnersTable}.*`)
    .orderBy('owner_idpersonne')
    .stream();

  return Readable.toWeb(query);
}

const departmentalOwnersRepository = {
  stream
};

export default departmentalOwnersRepository;
