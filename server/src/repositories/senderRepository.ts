import type { Insertable } from 'kysely';

import { download } from '~/controllers/fileRepository';
import db, { where } from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { SenderApi } from '~/models/SenderApi';
import {
  fromDocumentDBO,
  joinDocumentWithCreator,
  type DocumentWithCreatorDBO
} from '~/repositories/documentRepository';

const logger = createLogger('senderRepository');

export const sendersTable = 'senders';
export const Senders = (transaction = db) =>
  transaction<SenderDBO>(sendersTable);

type FindOneOptions = Partial<
  Pick<SenderApi, 'id' | 'name' | 'establishmentId'>
>;

async function findOne(opts: FindOneOptions): Promise<SenderApi | null> {
  logger.debug('Finding sender...', opts);
  const whereOptions = where<FindOneOptions>(
    ['id', 'name', 'establishmentId'],
    { table: sendersTable }
  );

  const query = Senders().where(whereOptions(opts));
  joinDocumentWithCreator(
    query,
    `${sendersTable}.signatory_one_document_id`,
    'signatory_one_document'
  );
  joinDocumentWithCreator(
    query,
    `${sendersTable}.signatory_two_document_id`,
    'signatory_two_document'
  );

  const sender = (await query.select(`${sendersTable}.*`).first()) as
    | SenderDBOWithDocuments
    | undefined;
  if (!sender) {
    return null;
  }

  logger.debug('Found sender', sender);
  return parseSenderApi(sender);
}

async function save(sender: SenderApi): Promise<void> {
  logger.debug('Saving sender...', sender);
  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('senders')
      .values(toSenderInsert(sender))
      .onConflict((oc) =>
        oc.column('id').doUpdateSet((eb) => ({
          name: eb.ref('excluded.name'),
          service: eb.ref('excluded.service'),
          firstName: eb.ref('excluded.firstName'),
          lastName: eb.ref('excluded.lastName'),
          address: eb.ref('excluded.address'),
          email: eb.ref('excluded.email'),
          phone: eb.ref('excluded.phone'),
          signatoryOneLastName: eb.ref('excluded.signatoryOneLastName'),
          signatoryOneFirstName: eb.ref('excluded.signatoryOneFirstName'),
          signatoryOneRole: eb.ref('excluded.signatoryOneRole'),
          signatoryOneFile: eb.ref('excluded.signatoryOneFile'),
          signatoryOneDocumentId: eb.ref('excluded.signatoryOneDocumentId'),
          signatoryTwoFirstName: eb.ref('excluded.signatoryTwoFirstName'),
          signatoryTwoLastName: eb.ref('excluded.signatoryTwoLastName'),
          signatoryTwoRole: eb.ref('excluded.signatoryTwoRole'),
          signatoryTwoFile: eb.ref('excluded.signatoryTwoFile'),
          signatoryTwoDocumentId: eb.ref('excluded.signatoryTwoDocumentId'),
          updatedAt: eb.ref('excluded.updatedAt')
        }))
      )
      .execute();
  });
  logger.debug('Saved sender', sender);
}

function toSenderInsert(sender: SenderApi): Insertable<DB['senders']> {
  return {
    id: sender.id,
    name: sender.name,
    service: sender.service,
    firstName: sender.firstName,
    lastName: sender.lastName,
    address: sender.address,
    email: sender.email,
    phone: sender.phone,
    signatoryOneFirstName: sender.signatories?.[0]?.firstName ?? null,
    signatoryOneLastName: sender.signatories?.[0]?.lastName ?? null,
    signatoryOneRole: sender.signatories?.[0]?.role ?? null,
    signatoryOneFile: sender.signatories?.[0]?.file?.id ?? null,
    signatoryOneDocumentId: sender.signatories?.[0]?.document?.id ?? null,
    signatoryTwoFirstName: sender.signatories?.[1]?.firstName ?? null,
    signatoryTwoLastName: sender.signatories?.[1]?.lastName ?? null,
    signatoryTwoRole: sender.signatories?.[1]?.role ?? null,
    signatoryTwoFile: sender.signatories?.[1]?.file?.id ?? null,
    signatoryTwoDocumentId: sender.signatories?.[1]?.document?.id ?? null,
    createdAt: new Date(sender.createdAt),
    updatedAt: new Date(sender.updatedAt),
    establishmentId: sender.establishmentId
  };
}

export interface SenderDBO {
  id: string;
  name: string | null;
  service: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  signatory_one_last_name: string | null;
  signatory_one_first_name: string | null;
  signatory_one_role: string | null;
  signatory_one_file: string | null;
  signatory_one_document_id: string | null;
  signatory_two_first_name: string | null;
  signatory_two_last_name: string | null;
  signatory_two_role: string | null;
  signatory_two_file: string | null;
  signatory_two_document_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  establishment_id: string;
}

export const formatSenderApi = (sender: SenderApi): SenderDBO => ({
  id: sender.id,
  name: sender.name,
  service: sender.service,
  first_name: sender.firstName,
  last_name: sender.lastName,
  address: sender.address,
  email: sender.email,
  phone: sender.phone,
  signatory_one_first_name: sender.signatories?.[0]?.firstName ?? null,
  signatory_one_last_name: sender.signatories?.[0]?.lastName ?? null,
  signatory_one_role: sender.signatories?.[0]?.role ?? null,
  signatory_one_file: sender.signatories?.[0]?.file?.id ?? null,
  signatory_one_document_id: sender.signatories?.[0]?.document?.id ?? null,
  signatory_two_first_name: sender.signatories?.[1]?.firstName ?? null,
  signatory_two_last_name: sender.signatories?.[1]?.lastName ?? null,
  signatory_two_role: sender.signatories?.[1]?.role ?? null,
  signatory_two_file: sender.signatories?.[1]?.file?.id ?? null,
  signatory_two_document_id: sender.signatories?.[1]?.document?.id ?? null,
  created_at: new Date(sender.createdAt),
  updated_at: new Date(sender.updatedAt),
  establishment_id: sender.establishmentId
});

type SenderDBOWithDocuments = SenderDBO & {
  signatory_one_document: DocumentWithCreatorDBO | null;
  signatory_two_document: DocumentWithCreatorDBO | null;
};

export const parseSenderApi = async (
  sender: SenderDBOWithDocuments
): Promise<SenderApi> => {
  let signatory_one_file;
  try {
    signatory_one_file = sender.signatory_one_file
      ? await download(sender.signatory_one_file)
      : null;
  } catch {
    signatory_one_file = null;
  }

  let signatory_two_file;
  try {
    signatory_two_file = sender.signatory_two_file
      ? await download(sender.signatory_two_file)
      : null;
  } catch {
    signatory_two_file = null;
  }

  return {
    id: sender.id,
    name: sender.name,
    service: sender.service,
    firstName: sender.first_name,
    lastName: sender.last_name,
    address: sender.address,
    email: sender.email,
    phone: sender.phone,
    signatories: [
      {
        firstName: sender.signatory_one_first_name,
        lastName: sender.signatory_one_last_name,
        role: sender.signatory_one_role,
        file: signatory_one_file,
        document: sender.signatory_one_document
          ? fromDocumentDBO(sender.signatory_one_document)
          : null
      },
      {
        firstName: sender.signatory_two_first_name,
        lastName: sender.signatory_two_last_name,
        role: sender.signatory_two_role,
        file: signatory_two_file,
        document: sender.signatory_two_document
          ? fromDocumentDBO(sender.signatory_two_document)
          : null
      }
    ],
    createdAt: new Date(sender.created_at).toJSON(),
    updatedAt: new Date(sender.updated_at).toJSON(),
    establishmentId: sender.establishment_id
  };
};

export default {
  findOne,
  save
};
