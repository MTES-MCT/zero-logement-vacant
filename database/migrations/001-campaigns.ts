// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'),
        knex.schema// @ts-ignore
            .createTable('campaigns', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.integer('campaignNumber').notNullable();
                table.string('startMonth').notNullable();
                table.string('kind').notNullable();
                table.jsonb('filters');
                table.timestamp('createdAt').defaultTo(knex.fn.now());
                table.timestamp('validatedAt');
                table.timestamp('sentAt');
            }),
        knex.schema// @ts-ignore
            .createTable('campaigns_housing', (table) => {
                table.uuid('campaignId').references('id').inTable('campaigns');
                table.string('housingRef');
            })// @ts-ignore
            .alterTable('campaigns_housing', table => {
                table.primary(['campaignId', 'housingRef'])
            }),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.dropTable('campaigns_housing'),
      knex.schema.dropTable('campaigns'),
      knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp";')
  ]);
};
