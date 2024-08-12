import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import { Establishments } from '~/repositories/establishmentRepository';

export const SirenStrasbourg = '246700488';
export const SirenSaintLo = '200066389';

export async function seed(knex: Knex): Promise<void> {
  await Establishments(knex)
    .whereIn('siren', [SirenStrasbourg, SirenSaintLo])
    .update({ available: true });

  // End-to-end test establishment
  await Establishments(knex)
    .where({ name: 'Zéro Logement Vacant à Marseille' })
    .delete();
  await Establishments(knex).insert({
    id: faker.string.uuid(),
    name: 'Zéro Logement Vacant à Marseille',
    siren: Number(faker.string.numeric(9)),
    available: true,
    localities_geo_code: ['13055'],
    campaign_intent: undefined,
    priority: undefined,
    kind: 'Commune',
    source: 'seed',
    updated_at: new Date()
  });
}
