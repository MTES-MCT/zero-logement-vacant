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
          })
  ]);
};
