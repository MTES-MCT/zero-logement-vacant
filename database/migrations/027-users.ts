// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('users', (table) => {
                table.timestamp('last_authenticated_at');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('users', (table) => {
              table.dropColumn('last_authenticated_at');
          })
  ]);
};
