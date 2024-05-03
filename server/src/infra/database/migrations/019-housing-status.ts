import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.renameColumn('precision', 'precisions');
    }),
    knex.raw(
      `alter table housing alter precisions type varchar(255)[] using array[precisions];`,
    ),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.renameColumn('precisions', 'precision');
    }),
    knex.raw(
      `alter table housing alter precision type varchar(255) using coalesce(precision[1], '');`,
    ),
  ]);
}
