import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import { establishmentsTable } from '~/repositories/establishmentRepository';

export const SirenStrasbourg = '246700488';
export const SirenSaintLo = '200066389';
export const SirenBasRhin = '130010218';

export const ZeroLogementVacantEstablishment = 'ZLV Démo';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235442_establishments');
  await knex(establishmentsTable)
    .whereIn('siren', [SirenStrasbourg, SirenSaintLo, SirenBasRhin])
    .update({ available: true });

  // End-to-end test establishment
  await knex(establishmentsTable)
    .where({ name: ZeroLogementVacantEstablishment })
    .delete();
  await knex(establishmentsTable).insert({
    id: faker.string.uuid(),
    name: ZeroLogementVacantEstablishment,
    siren: Number(faker.string.numeric(9)),
    available: true,
    localities_geo_code: ['13055'],
    kind: 'COM',
    source: 'seed',
    updated_at: new Date()
  });
  console.timeEnd('20240404235442_establishments');
  console.log('\n');
}
