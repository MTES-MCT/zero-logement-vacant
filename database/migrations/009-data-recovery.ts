// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.specificType('vacancy_reasons', 'text[]');
            }),
        knex.schema// @ts-ignore
            .alterTable('events', (table) => {
                table.text('content').alter();
                table.text('contact_kind');
            }),
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.specificType('recovery_id', 'text');
                table.integer('kind').alter();
                table.renameColumn('kind', 'reminder_number');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('housing', (table) => {
              table.dropColumn('vacancy_reasons');
          }),
      knex.schema// @ts-ignore
          .alterTable('events', (table) => {
              table.dropColumn('contact_kind');
          }),
      knex.schema// @ts-ignore
          .alterTable('campaigns', (table) => {
              table.dropColumn('recovery_id');
              table.renameColumn('reminder_number', 'kind')
          })
  ]);
};
