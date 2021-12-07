// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('users', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.integer('establishment_id').references('id').inTable('establishments').notNullable();
                table.string('email').notNullable();
                table.string('password').notNullable();
                table.string('first_name').notNullable();
                table.string('last_name').notNullable();
            }),
        knex.schema// @ts-ignore
            .alterTable('campaigns', (table) => {
                table.uuid('created_by').references('id').inTable('users').notNullable();
            }),
        knex.schema// @ts-ignore
            .alterTable('events', (table) => {
                table.uuid('created_by').references('id').inTable('users').notNullable();
            }),
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .alterTable('events', (table) => {
              table.dropColumn('created_by');
          }),
      knex.schema// @ts-ignore
          .alterTable('campaigns', (table) => {
              table.dropColumn('created_by');
          }),
      knex.schema.dropTable('users')
  ]);
};
