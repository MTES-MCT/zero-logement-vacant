// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('owners', (table) => {
                table.string('owner_kind').nullable().alter();
                table.string('owner_kind_detail').nullable().alter();
            }),
        knex.schema// @ts-ignore
            .alterTable('owners_housing', (table) => {
                table.integer('rank');
            }),
        knex.raw("update owners set raw_address = array_remove(raw_address, '')"),
        knex.raw("update owners_housing set rank = 1"),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.raw("delete from owners_housing where rank > 1"),
      knex.schema// @ts-ignore
          .alterTable('owners_housing', (table) => {
              table.dropColumn('rank');
          })
  ]);
};
