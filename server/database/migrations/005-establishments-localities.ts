// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('establishments', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.integer('epci_id');
                table.string('name').notNullable();
                table.specificType('localities_id', 'uuid[]').notNullable();
                table.specificType('housing_scopes', 'text[]');
                table.boolean('available').default(false)
            }),
        knex.schema// @ts-ignore
            .createTable('localities', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('geo_code').notNullable();
                table.string('name').notNullable();
            }),
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.uuid('establishment_id').references('id').inTable('establishments').notNullable();
            }),
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.string('housing_scope');
            }),
        knex.schema // @ts-ignore
            .table('campaigns', function (table) {
                table.index(['establishment_id'], 'campaigns_establishment_idx');
            }),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema // @ts-ignore
          .table('campaigns', function (table) {
              table.dropIndex(['establishment_id'], 'campaigns_establishment_idx');
          }),
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
