import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return Promise.all([
    knex.schema.createTable('contact_points', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table
        .uuid('establishment_id')
        .references('id')
        .inTable('establishments')
        .notNullable();
      table.string('title').notNullable();
      table.string('opening');
      table.string('address');
      table.string('geo_code');
      table.string('email');
      table.string('phone');
      table.string('notes');
    }),
    knex.schema.alterTable('housing', (table) => {
      table.dropIndex(
        ['insee_code', 'data_years'],
        'housing_insee_code_data_years_idx'
      );
      table.dropIndex(['insee_code'], 'housing_insee_code_idx');
      table.renameColumn('insee_code', 'geo_code');
      table.index(
        ['geo_code', 'data_years'],
        'housing_geo_code_data_years_idx'
      );
      table.index(['insee_code'], 'housing_geo_code_idx');
    }),
  ]);
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.dropTable('contact_points'),
    knex.schema.alterTable('housing', (table) => {
      table.dropIndex(
        ['geo_code', 'data_years'],
        'housing_geo_code_data_years_idx'
      );
      table.dropIndex(['insee_code'], 'housing_geo_code_idx');
      table.renameColumn('geo_code', 'insee_code');
      table.index(
        ['insee_code', 'data_years'],
        'housing_insee_code_data_years_idx'
      );
      table.index(['insee_code'], 'housing_insee_code_idx');
    }),
  ]);
};
