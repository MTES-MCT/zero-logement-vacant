// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema // @ts-ignore
            .table('campaigns_housing', function (table) {
                table.index(['housing_id'], 'campaigns_housing_housing_id_idx');
            }),
        knex.schema// @ts-ignore
            .alterTable('localities', (table) => {
                table.string('locality_kind');
            }),
        knex.schema// @ts-ignore
            .createTable('buildings', (table) => {
                table.string('id').primary();
                table.integer('housing_count').notNullable();
                table.integer('vacant_housing_count').notNullable();
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('localities', (table) => {
                table.dropColumn('locality_kind');
            }),
        knex.schema // @ts-ignore
            .table('campaigns_housing', function (table) {
                table.dropIndex(['housing_id'], 'campaigns_housing_housing_id_idx');
            }),
        knex.schema.dropTable('buildings')
    ]);
};
