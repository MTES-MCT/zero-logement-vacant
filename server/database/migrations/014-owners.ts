// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('owners', (table) => {
                table.string('house_number');
                table.string('street');
                table.string('postal_code');
                table.string('city');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('owners', (table) => {
              table.dropColumn('house_number');
              table.dropColumn('street');
              table.dropColumn('postal_code');
              table.dropColumn('city');
          })
  ]);
};
