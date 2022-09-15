import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import path from 'path';

export const SirenStrasbourg = '246700488'
export const SirenSaintLo = '200066389'

// @ts-ignore
exports.seed = function(knex) {
    //EPCI
    return knex.schema.raw(`call load_establishment_localities('${path.join(__dirname, '../../data/common/epci.csv')}')`)
        .then(() =>
            //Mise à disposition
            Promise.all([
                knex.table(establishmentsTable)
                    .update({available: false})
                    .then(() =>
                        knex.table(establishmentsTable).update({available: true}).whereIn('siren', [
                            SirenStrasbourg,
                            SirenSaintLo
                        ])
                    )
                ])
        )
};
