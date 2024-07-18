import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.uuid('created_by').notNullable().alter({ alterNullable: true, });
    table.renameColumn('created_by', 'user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.uuid('user_id').nullable().alter({ alterNullable: true, });
    table.renameColumn('user_id', 'created_by');
  });
}
