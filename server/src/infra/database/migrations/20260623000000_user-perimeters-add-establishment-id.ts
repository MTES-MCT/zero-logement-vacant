import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_perimeters', (table) => {
    table.uuid('establishment_id').nullable();
  });

  await knex.raw(`
    UPDATE user_perimeters
    SET establishment_id = users.establishment_id
    FROM users
    WHERE user_perimeters.user_id = users.id
  `);

  await knex('user_perimeters').whereNull('establishment_id').delete();

  await knex.schema.alterTable('user_perimeters', (table) => {
    table.dropPrimary();
    table.uuid('establishment_id').notNullable().alter();
    table
      .foreign('establishment_id')
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.primary(['user_id', 'establishment_id']);
    table.index(['establishment_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DELETE FROM user_perimeters kept
    USING user_perimeters removed
    WHERE kept.user_id = removed.user_id
    AND kept.ctid < removed.ctid
  `);

  await knex.schema.alterTable('user_perimeters', (table) => {
    table.dropPrimary();
    table.dropIndex(['establishment_id']);
    table.dropForeign(['establishment_id']);
    table.dropColumn('establishment_id');
    table.primary(['user_id']);
  });
}
