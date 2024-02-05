// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('events', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('owner_id');
                table.string('housing_id');
                table.string('kind').notNullable();
                table.timestamp('created_at').defaultTo(knex.fn.now());
                table.string('content')
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.dropTable('events')
  ]);
};
