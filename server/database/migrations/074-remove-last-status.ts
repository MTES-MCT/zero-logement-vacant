import { Knex } from 'knex';

exports.up = async function (knex: Knex) {
  await knex('housing').where({ status: 6 }).update({ status: 4 });
};

exports.down = async function () {
  // There's no going back
};
