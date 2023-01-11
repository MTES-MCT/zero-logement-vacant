import { genProspectApi } from '../../../server/test/testFixtures';
import prospectRepository, {
  prospectsTable,
} from '../../../server/repositories/prospectRepository';
import { Knex } from 'knex';
import { Establishment1 } from './001-establishments';

export const Prospect1 = genProspectApi(Establishment1);

exports.seed = function (knex: Knex) {
  return knex.table(prospectsTable).insert({
    ...prospectRepository.formatProspectApi(Prospect1),
    last_account_request_at: new Date(),
  });
};
