// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('owners', (table) => {
                table.dropColumn('beneficiary_count');
                table.dropColumn('local_ids');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('owners', (table) => {
              table.integer('beneficiary_count');
              table.specificType('local_ids', 'text[]');
          })
  ]);
};
