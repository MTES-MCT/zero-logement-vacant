import db, { where } from '~/infra/database';
import { logger } from '~/infra/logger';
import { SenderApi } from '~/models/SenderApi';
import { download } from '~/controllers/fileRepository';

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

  const sender = await Senders().where(whereOptions(opts)).first();
  if (!sender) {
    return null;
  }

  logger.debug('Found sender', sender);
  return parseSenderApi(sender);
}

async function save(sender: SenderApi): Promise<void> {
  logger.debug('Saving sender...', sender);
  await Senders()
    .insert(formatSenderApi(sender))
    .onConflict('id')
    .merge([
      'name',
      'service',
      'first_name',
      'last_name',
      'address',
      'email',
      'phone',
      'signatory_one_last_name',
      'signatory_one_first_name',
      'signatory_one_role',
      'signatory_one_file',
      'signatory_two_first_name',
      'signatory_two_last_name',
      'signatory_two_role',
      'signatory_two_file',
      'updated_at'
    ]);
  logger.debug('Saved sender', sender);
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
  signatory_two_first_name: string | null;
  signatory_two_last_name: string | null;
  signatory_two_role: string | null;
  signatory_two_file: string | null;
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
  signatory_two_first_name: sender.signatories?.[1]?.firstName ?? null,
  signatory_two_last_name: sender.signatories?.[1]?.lastName ?? null,
  signatory_two_role: sender.signatories?.[1]?.role ?? null,
  signatory_two_file: sender.signatories?.[1]?.file?.id ?? null,
  created_at: new Date(sender.createdAt),
  updated_at: new Date(sender.updatedAt),
  establishment_id: sender.establishmentId
});

export const parseSenderApi = async (
  sender: SenderDBO
): Promise<SenderApi> => ({
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
      file: sender.signatory_one_file
        ? await download(sender.signatory_one_file)
        : null
    },
    {
      firstName: sender.signatory_two_first_name,
      lastName: sender.signatory_two_last_name,
      role: sender.signatory_two_role,
      file: sender.signatory_two_file
        ? await download(sender.signatory_two_file)
        : null
    }
  ],
  createdAt: new Date(sender.created_at).toJSON(),
  updatedAt: new Date(sender.updated_at).toJSON(),
  establishmentId: sender.establishment_id
});

export default {
  findOne,
  save
};
