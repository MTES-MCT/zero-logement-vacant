import { Knex } from 'knex';

import { Establishments } from '~/repositories/establishmentRepository';
import { Housing } from '~/repositories/housingRepository';
import { parseUserApi, Users } from '~/repositories/userRepository';

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
  const admin = await Users(knex)
    .where({ email: 'admin@zerologementvacant.beta.gouv.fr' })
    .first()
    .then((admin) => (admin ? parseUserApi(admin) : null));
  if (!admin) {
    throw new Error('admin@zerologementvacant.beta.gouv.fr not found');
  }
  return admin;
}

export async function getHousings(knex: Knex) {
  const establishments = await Establishments(knex).where({ available: true });
  const geoCodes = establishments
    .map((establishment) => establishment.localities_geo_code)
    .flat();
  const housings = await Housing(knex)
    .whereIn('geo_code', geoCodes)
    .limit(LIMIT);
  const housingKeys = housings.map((housing): [string, string] => [
    housing.geo_code,
    housing.id
  ]);
  return { housings, housingKeys };
}
