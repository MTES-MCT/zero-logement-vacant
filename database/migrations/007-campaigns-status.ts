// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('campaigns_housing', table => {
                table.string('status').default('En attente de retour');
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
