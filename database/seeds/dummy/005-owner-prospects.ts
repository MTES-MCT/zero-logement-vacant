import { Knex } from 'knex';
import ownerProspectRepository, {
  ownerProspectsTable,
} from '../../../server/repositories/ownerProspectRepository';
import { genOwnerProspectApi } from '../../../server/test/testFixtures';
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { SirenStrasbourg } from './001-establishments';

exports.seed = async function (knex: Knex) {
  const establishment = await knex
    .table(establishmentsTable)
    .where('siren', SirenStrasbourg)
    .first();

  const ownerProspects = [
    genOwnerProspectApi(establishment.localities_geo_code[0]),
    genOwnerProspectApi(establishment.localities_geo_code[1]),
    genOwnerProspectApi(establishment.localities_geo_code[2]),
    genOwnerProspectApi(),
  ];

  await Promise.all(
    ownerProspects
      .map(ownerProspectRepository.formatOwnerProspectApi)
      .map((op) => knex.table(ownerProspectsTable).insert(op))
  );
};
