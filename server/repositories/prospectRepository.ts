import db from './db';
import { ProspectApi } from '../models/ProspectApi';
import { establishmentsTable } from './establishmentRepository';

export const prospectsTable = 'prospects';

const get = async (email: string): Promise<ProspectApi | null> => {
  console.log('Get prospect by email', email);

  const prospect = await db(prospectsTable)
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
      { e: establishmentsTable },
      'e.siren',
      `${prospectsTable}.establishment_siren`
    )
    .first();

  return prospect ? parseProspectApi(prospect) : null;
};

const upsert = async (prospectApi: ProspectApi): Promise<ProspectApi> => {
  console.log('Upsert prospect with email', prospectApi.email);

  try {
    return db(prospectsTable)
      .insert({
        ...formatProspectApi(prospectApi),
        last_account_request_at: new Date(),
      })
      .onConflict('email')
      .merge()
      .returning('*')
      .then((_) => parseProspectApi(_[0]));
  } catch (err) {
    console.error('Upserting prospect failed', err, prospectApi);
    throw new Error('Upserting prospect failed');
  }
};

const remove = async (email: string): Promise<void> => {
  console.log('Remove prospect with email', email);

  await db(prospectsTable).where('email', email).delete();
};

const parseProspectApi = (result: any): ProspectApi =>
  <ProspectApi>{
    email: result.email,
    hasAccount: result.has_account,
    hasCommitment: result.has_commitment,
    establishment: {
      id: result.establishment_id,
      siren: result.establishment_siren,
      campaignIntent: result.campaign_intent,
    },
  };

const formatProspectApi = (prospectApi: ProspectApi) => ({
  email: prospectApi.email,
  has_account: prospectApi.hasAccount,
  has_commitment: prospectApi.hasCommitment,
  establishment_siren: prospectApi.establishment?.siren,
});

export default {
  get,
  upsert,
  remove,
  formatProspectApi,
  parseProspectApi,
};
