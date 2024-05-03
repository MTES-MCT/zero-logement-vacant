import { Knex } from 'knex';
import fs from 'fs';
import path from 'path';

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .alterTable('housing', (table) => {
      table.string('energy_consumption');
      table.string('energy_consumption_worst');
      table.string('occupancy').notNullable().defaultTo('V');
      table.string('invariant').nullable().alter();
      table.integer('vacancy_start_year').nullable().alter();
      table.string('cadastral_reference').nullable().alter();
    })
    .then(() =>
      knex.schema.raw(
        fs
          .readFileSync(
            path.join(
              __dirname,
              '../procedures/002-load-non-vacant-housing.sql',
            ),
          )
          .toString(),
      ),
    );
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.raw('DROP PROCEDURE load_non_vacant_housing(date_format text)'),
    knex.schema.alterTable('housing', (table) => {
      table.dropColumns(
        'energy_consumption',
        'energy_consumption_worst',
        'occupancy',
      );
    }),
  ]);
}
