import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';

export const SirenStrasbourg = '246700488';
export const SirenSaintLo = '200066389';

exports.seed = async function (knex: Knex) {
  // Mise à disposition
  await knex
    .table(establishmentsTable)
    .update({ available: true })
    .whereIn('siren', [SirenStrasbourg, SirenSaintLo]);
};
