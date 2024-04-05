import { Knex } from 'knex';

import { establishmentsTable } from '~/repositories/establishmentRepository';

export const SirenStrasbourg = '246700488';
export const SirenSaintLo = '200066389';

export async function seed(knex: Knex): Promise<void> {
  // Mise à disposition
  await knex
    .table(establishmentsTable)
    .update({ available: true })
    .whereIn('siren', [SirenStrasbourg, SirenSaintLo]);
}
