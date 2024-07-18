import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { CampaignIntent } from '~/models/EstablishmentApi';
import { ProspectApi } from '~/models/ProspectApi';
import { establishmentsTable } from './establishmentRepository';

export const prospectsTable = 'prospects';
export const Prospects = (transaction = db) =>
  transaction<ProspectDBO>(prospectsTable);

async function get(email: string): Promise<ProspectApi | null> {
  logger.info('Get prospect by email', email);

  const prospect = await Prospects()
    .select(
      `${prospectsTable}.*`,
      'e.id as establishment_id',
      'e.siren as establishment_siren',
      'e.campaign_intent as campaign_intent'
    )
    .where('email', email)
    // Unoptimized because siren is not a foreign key
    // but still more performant than listing all the establishments
    .leftJoin(
      { e: establishmentsTable, },
      'e.siren',
      `${prospectsTable}.establishment_siren`
    )
    .first();

  return prospect ? parseProspectApi(prospect) : null;
}

async function exists(email: string): Promise<boolean> {
  logger.debug(`Does prospect ${email} exist`);

  const prospect = await Prospects()
    .select('email')
    .where('email', email)
    .first();

  return !!prospect;
}

async function upsert(prospect: ProspectApi): Promise<void> {
  logger.info('Upsert prospect with email', prospect.email);
  await Prospects()
    .insert(formatProspectApi(prospect))
    .onConflict('email')
    .merge();
}

async function remove(email: string): Promise<void> {
  logger.info('Remove prospect with email', email);

  await Prospects().where('email', email).delete();
}

export interface ProspectRecordDBO {
  email: string;
  establishment_siren?: number;
  has_account: boolean;
  has_commitment: boolean;
  last_account_request_at: Date;
}

export interface ProspectDBO extends ProspectRecordDBO {
  establishment_id: string;
  campaign_intent: string;
}

export const parseProspectApi = (prospect: ProspectDBO): ProspectApi => ({
  email: prospect.email,
  hasAccount: prospect.has_account,
  hasCommitment: prospect.has_commitment,
  lastAccountRequestAt: prospect.last_account_request_at,
  establishment: {
    id: prospect.establishment_id,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    siren: prospect.establishment_siren,
    campaignIntent: prospect.campaign_intent as CampaignIntent | undefined,
  },
});

export const formatProspectApi = (
  prospect: ProspectApi
): ProspectRecordDBO => ({
  email: prospect.email,
  has_account: prospect.hasAccount,
  has_commitment: prospect.hasCommitment,
  last_account_request_at: prospect.lastAccountRequestAt,
  establishment_siren: prospect.establishment?.siren,
});

export default {
  get,
  exists,
  upsert,
  remove,
  formatProspectApi,
  parseProspectApi,
};
