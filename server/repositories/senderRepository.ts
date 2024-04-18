import { SenderApi } from '../models/SenderApi';
import db, { where } from './db';
import { logger } from '../utils/logger';

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
      'signatory_last_name',
      'signatory_first_name',
      'signatory_role',
      'signatory_file',
      'updated_at',
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
  signatory_last_name: string | null;
  signatory_first_name: string | null;
  signatory_role: string | null;
  signatory_file: string | null;
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
  signatory_last_name: sender.signatoryLastName,
  signatory_first_name: sender.signatoryFirstName,
  signatory_role: sender.signatoryRole,
  signatory_file: sender.signatoryFile,
  created_at: new Date(sender.createdAt),
  updated_at: new Date(sender.updatedAt),
  establishment_id: sender.establishmentId,
});

export const parseSenderApi = (sender: SenderDBO): SenderApi => ({
  id: sender.id,
  name: sender.name,
  service: sender.service,
  firstName: sender.first_name,
  lastName: sender.last_name,
  address: sender.address,
  email: sender.email,
  phone: sender.phone,
  signatoryLastName: sender.signatory_last_name,
  signatoryFirstName: sender.signatory_first_name,
  signatoryRole: sender.signatory_role,
  signatoryFile: sender.signatory_file,
  createdAt: new Date(sender.created_at).toJSON(),
  updatedAt: new Date(sender.updated_at).toJSON(),
  establishmentId: sender.establishment_id,
});

export default {
  findOne,
  save,
};
