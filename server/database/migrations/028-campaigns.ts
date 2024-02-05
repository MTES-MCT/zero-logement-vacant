// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.unique(['establishment_id', 'campaign_number', 'reminder_number'])
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('campaigns', (table) => {
              table.dropUnique(['establishment_id', 'campaign_number', 'reminder_number'])
          })
  ]);
};
