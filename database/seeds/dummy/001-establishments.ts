import { establishmentsTable } from '../../../server/repositories/establishmentRepository';

export const SirenStrasbourg = '246700488'
export const SirenSaintLo = '200066389'

// @ts-ignore
exports.seed = function(knex) {
    //Mise à disposition
    knex.table(establishmentsTable)
        .update({available: false})
        .then(() =>
            knex.table(establishmentsTable).update({available: true}).whereIn('siren', [
                SirenStrasbourg,
                SirenSaintLo
            ])
        )
};
