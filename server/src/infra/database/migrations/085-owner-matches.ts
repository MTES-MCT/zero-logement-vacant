import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('owner_matches', (table) => {
    table
      .uuid('owner_id')
      .references('id')
      .inTable('owners')
      .notNullable()
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('idpersonne').notNullable();
    table.primary(['owner_id', 'idpersonne']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('owner_matches');
}
