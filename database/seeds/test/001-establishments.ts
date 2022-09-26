import { genEstablishmentApi, genLocalityApi } from '../../../server/test/testFixtures';
import establishmentRepository, { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { localitiesTable } from '../../../server/repositories/localityRepository';
import { Knex } from 'knex';

export const Locality1 = genLocalityApi()
export const Locality2 = genLocalityApi()

export const Establishment1 = genEstablishmentApi(Locality1)
export const Establishment2 = genEstablishmentApi(Locality2)

// @ts-ignore
exports.seed = function(knex: Knex) {

    return Promise.all([
        knex.table(localitiesTable).insert(establishmentRepository.formatLocalityApi(Locality1)),
        knex.table(localitiesTable).insert(establishmentRepository.formatLocalityApi(Locality2)),
        knex.table(establishmentsTable).insert(establishmentRepository.formatEstablishmentApi(Establishment1)),
        knex.table(establishmentsTable).insert(establishmentRepository.formatEstablishmentApi(Establishment2))
    ])
};
