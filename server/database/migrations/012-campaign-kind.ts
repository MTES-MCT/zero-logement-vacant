// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.integer('kind').defaultTo(0);
            }),
        knex.raw('update campaigns set kind = 1 where reminder_number > 0')

    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('campaigns', (table) => {
              table.dropColumn('kind');
          })
  ]);
};
