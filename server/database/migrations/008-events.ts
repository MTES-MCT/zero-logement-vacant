// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('events', (table) => {
                table.uuid('campaign_id').references('id').inTable('campaigns');
                table.uuid('housing_id').references('id').inTable('housing').alter();
                table.uuid('owner_id').references('id').inTable('owners').alter();
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('events', (table) => {
              table.dropColumn('campaign_id');
              table.dropForeign('housing_id');
              table.dropForeign('owner_id');
          }),
  ]);
};
