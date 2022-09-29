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
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/001-load-housing.sql')).toString()),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/002-load-owners.sql')).toString()),
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.uuid('created_by').nullable().alter();
            }),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.raw('DROP PROCEDURE load_housing()'),
      knex.schema.raw('DROP PROCEDURE load_owners()'),
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
