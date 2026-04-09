import type { UserEstablishment } from '@zerologementvacant/models';
import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';

export const USERS_ESTABLISHMENTS_TABLE = 'users_establishments';

export const UsersEstablishments = (transaction = db) =>
  transaction<UserEstablishmentDBO>(USERS_ESTABLISHMENTS_TABLE);

export interface UserEstablishmentDBO {
  user_id: string;
  establishment_id: string;
  establishment_siren: string;
  has_commitment: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

async function getAuthorizedEstablishments(
  userId: string
): Promise<UserEstablishment[]> {
  logger.debug('Get authorized establishments for user', userId);

  const results = await UsersEstablishments()
    .where('user_id', userId)
    .orderBy('created_at', 'asc');

  return results.map(fromUserEstablishmentDBO);
}

async function setAuthorizedEstablishments(
  userId: string,
  establishments: Array<{
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }>
): Promise<void> {
  logger.info('Setting authorized establishments for user', {
    userId,
    count: establishments.length
  });

  await withinTransaction(async (trx) => {
    await UsersEstablishments(trx).where('user_id', userId).delete();

    if (establishments.length > 0) {
      const now = new Date();
      await UsersEstablishments(trx).insert(
        establishments.map((e) => ({
          user_id: userId,
          establishment_id: e.establishmentId,
          establishment_siren: e.establishmentSiren,
          has_commitment: e.hasCommitment,
          created_at: now,
          updated_at: now
        }))
      );
    }
  });
}

async function addAuthorizedEstablishment(
  userId: string,
  establishment: {
    establishmentId: string;
    establishmentSiren: string;
    hasCommitment: boolean;
  }
): Promise<void> {
  logger.info('Adding authorized establishment for user', {
    userId,
    establishmentId: establishment.establishmentId
  });

  const now = new Date();
  await UsersEstablishments()
    .insert({
      user_id: userId,
      establishment_id: establishment.establishmentId,
      establishment_siren: establishment.establishmentSiren,
      has_commitment: establishment.hasCommitment,
      created_at: now,
      updated_at: now
    })
    .onConflict(['user_id', 'establishment_id'])
    .merge(['has_commitment', 'updated_at']);
}

async function hasAccessToEstablishment(
  userId: string,
  establishmentId: string
): Promise<boolean> {
  const result = await UsersEstablishments()
    .where({ user_id: userId, establishment_id: establishmentId })
    .first();

  return !!result;
}

async function isMultiStructure(userId: string): Promise<boolean> {
  const result = await UsersEstablishments()
    .where({ user_id: userId, has_commitment: true })
    .count('establishment_id as count')
    .first();

  const count = result as { count: string } | undefined;
  return Number(count?.count) > 1;
}

export const fromUserEstablishmentDBO = (
  dbo: UserEstablishmentDBO
): UserEstablishment => ({
  establishmentId: dbo.establishment_id,
  establishmentSiren: dbo.establishment_siren,
  hasCommitment: dbo.has_commitment
});

export default {
  getAuthorizedEstablishments,
  setAuthorizedEstablishments,
  addAuthorizedEstablishment,
  hasAccessToEstablishment,
  isMultiStructure
};
