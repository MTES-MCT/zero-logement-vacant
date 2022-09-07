import { genEstablishmentApi, genLocalityApi } from '../../server/test/testFixtures';
import establishmentRepository from '../../server/repositories/establishmentRepository';

export const Locality1 = genLocalityApi()

export const Establishment1 = genEstablishmentApi(Locality1)

// @ts-ignore
exports.seed = function(knex) {

    return Promise.all([
        knex.table('localities').insert(establishmentRepository.formatLocalityApi(Locality1)),
        knex.table('establishments').insert(establishmentRepository.formatEstablishmentApi(Establishment1))
    ])
};
