import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('campaigns', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.integer('campaign_number').notNullable();
      table.string('start_month').notNullable();
      table.string('kind').notNullable();
      table.jsonb('filters');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('validated_at');
      table.timestamp('exported_at');
      table.timestamp('sent_at');
      table.date('sending_date');
    }),
    knex.schema
      .createTable('campaigns_housing', (table) => {
        table.uuid('campaign_id').references('id').inTable('campaigns');
        table.uuid('housing_id').references('id').inTable('housing');
      })
      .alterTable('campaigns_housing', (table) => {
        table.primary(['campaign_id', 'housing_id']);
      }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.dropTable('campaigns_housing'),
    knex.schema.dropTable('campaigns'),
  ]);
}
