// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('campaigns_housing', table => {
                table.integer('status').default(0);
                table.string('step');
                table.string('precision');
            }),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('campaigns_housing', table => {
              table.dropColumns(['status', 'step', 'precision'])
          }),
  ]);
};
