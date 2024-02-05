// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.integer('beneficiary_count');
            }),
        knex.raw('update housing set beneficiary_count = (select max(o.beneficiary_count) from owners o, owners_housing oh where o.id = oh.owner_id and housing.id = oh.housing_id)')
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('housing', (table) => {
              table.dropColumn('beneficiary_count');
          })
  ]);
};
