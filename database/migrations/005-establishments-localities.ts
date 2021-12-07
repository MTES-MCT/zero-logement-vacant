// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('establishments', (table) => {
                table.integer('id').primary();
                table.string('name').notNullable();
                table.specificType('housing_scopes', 'text[]');
            }),
        knex.schema// @ts-ignore
            .createTable('localities', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.integer('establishment_id').references('id').inTable('establishments').notNullable();
                table.string('geo_code').notNullable();
                table.string('name').notNullable();
            }),
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.integer('establishment_id').references('id').inTable('establishments').notNullable();
            }),
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.string('housing_scope');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('housing', (table) => {
              table.dropColumn('housing_scope');
          }),
      knex.schema// @ts-ignore
          .alterTable('campaigns', (table) => {
              table.dropColumn('establishment_id');
          }),
      knex.schema.dropTable('localities'),
      knex.schema.dropTable('establishments')
  ]);
};
