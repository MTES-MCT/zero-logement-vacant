import { Knex } from 'knex';

import {
  EstablishmentDBO,
  establishmentsTable
} from '~/repositories/establishmentRepository';
import { HousingDBO, housingTable } from '~/repositories/housingRepository';
import {
  fromUserDBO,
  USERS_TABLE,
  UserDBO
} from '~/repositories/userRepository';

export const LIMIT = Number.MAX_SAFE_INTEGER;
export const BATCH_SIZE = 500;

export function chunk<T>(array: ReadonlyArray<T>, size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size) as T[]);
  }
  return chunks;
}

export async function batchedWhereIn<T>(
  knex: Knex,
  tableFn: (knex: Knex) => Knex.QueryBuilder,
  columns: [string, string],
  values: ReadonlyArray<[string, string]>
): Promise<T[]> {
  const batches = chunk(values, BATCH_SIZE);
  const results: T[] = [];
  for (const batch of batches) {
    const batchResults = await tableFn(knex).whereIn(columns, batch);
    results.push(...batchResults);
  }
  return results;
}

export async function getAdmin(knex: Knex) {
  const admin = await knex<UserDBO>(USERS_TABLE)
    .where({ email: 'admin@zerologementvacant.beta.gouv.fr' })
    .first()
    .then((admin) => (admin ? fromUserDBO(admin) : null));
  if (!admin) {
    throw new Error('admin@zerologementvacant.beta.gouv.fr not found');
  }
  return admin;
}

export async function getHousings(knex: Knex) {
  const establishments = await knex<EstablishmentDBO>(
    establishmentsTable
  ).where({ available: true });
  const geoCodes = establishments
    .map((establishment) => establishment.localities_geo_code)
    .flat();
  const housings = await knex<HousingDBO>(housingTable)
    .whereIn('geo_code', geoCodes)
    .limit(LIMIT);
  const housingKeys = housings.map((housing): [string, string] => [
    housing.geo_code,
    housing.id
  ]);
  return { housings, housingKeys };
}
