import { Knex } from 'knex';

import prospectRepository, {
  prospectsTable,
} from '~/repositories/prospectRepository';
import { genProspectApi } from '~/test/testFixtures';
import { Establishment1 } from './20240405011849_establishments';

export const Prospect1 = genProspectApi(Establishment1);

export async function seed(knex: Knex): Promise<void> {
  await knex.table(prospectsTable).insert({
    ...prospectRepository.formatProspectApi(Prospect1),
    last_account_request_at: new Date(),
  });
}
