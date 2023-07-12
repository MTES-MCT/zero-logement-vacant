import { Knex } from 'knex';
import { housingTable } from '../../server/repositories/housingRepository';

exports.up = async function (knex: Knex) {
  await knex(housingTable).where({ status: 6 }).update({ status: 4 });
};

exports.down = async function () {
  // There's no going back
};
