// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('owners_housing', (table) => {
                table.date('start_date');
                table.date('end_date');
                table.string('origin');
            }),
        knex.raw("update owners_housing set origin = 'Lovac'")
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.raw("delete from owners_housing where rank > 1"),
      knex.schema// @ts-ignore
          .alterTable('owners_housing', (table) => {
              table.dropColumn('start_date');
              table.dropColumn('end_date');
              table.dropColumn('origin');
          })
  ]);
};
