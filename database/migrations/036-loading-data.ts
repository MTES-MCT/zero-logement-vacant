import path from 'path';
import fs from 'fs';
import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = function(knex: Knex) {
    return Promise.all([
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/001-load-housing.sql')).toString()),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/002-load-owners.sql')).toString()),
        knex.schema.raw(fs.readFileSync(path.join(__dirname, '../procedures/003-load-owners-housing.sql')).toString()),
        knex.schema// @ts-ignore
            .alterTable('housing', (table: CreateTableBuilder) => {
                table.index(['local_id'], 'housing_local_id_idx');
            })
    ]);
};

exports.down = function(knex: Knex) {
  return Promise.all([
      knex.schema.raw('DROP PROCEDURE load_housing(jdatnss_format text)'),
      knex.schema.raw('DROP PROCEDURE load_owners(jdatnss_format text)'),
      knex.schema.raw('DROP PROCEDURE load_owners_housing(jdatnss_format text)'),
      knex.schema
          .alterTable('housing', (table: CreateTableBuilder) => {
              table.dropIndex(['local_id'], 'housing_local_id_idx');
          })
  ]);
};
