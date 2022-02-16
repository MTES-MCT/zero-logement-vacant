// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.string('building_location');
                table.integer('rental_value');
                table.string('ownership_kind');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('housing', (table) => {
              table.dropColumn('building_location');
              table.dropColumn('rental_value');
              table.dropColumn('ownership_kind');
          })
  ]);
};
