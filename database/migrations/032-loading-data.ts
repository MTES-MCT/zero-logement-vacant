import path from 'path';
import fs from 'fs';

// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('localities', (table) => {table.unique('geo_code')}),
        knex.schema// @ts-ignore
            .alterTable('establishments', (table) => {table.unique('siren')}),
        knex.schema// @ts-ignore
            .alterTable('users', (table) => {table.unique('email')}),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/001-load_establishments_localities.sql')).toString()),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/002-load-housing.sql')).toString()),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/003-load-owners.sql')).toString()),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/004-load-data.sql')).toString()),
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.uuid('created_by').nullable().alter();
            }),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.raw('DROP PROCEDURE load_establishment_localities(text)'),
      knex.schema.raw('DROP PROCEDURE load_housing()'),
      knex.schema.raw('DROP PROCEDURE load_owners()'),
      knex.schema.raw('DROP PROCEDURE load_data(text)'),
      knex.schema// @ts-ignore
          .alterTable('localities', (table) => {
              table.dropUnique(['geo_code'])
          }),
      knex.schema// @ts-ignore
          .alterTable('establishments', (table) => {
              table.dropUnique(['siren'])
          }),
      knex.schema// @ts-ignore
          .alterTable('users', (table) => {
              table.dropUnique(['email'])
          })
  ]);
};
