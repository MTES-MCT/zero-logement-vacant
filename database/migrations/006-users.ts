// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('users', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.integer('establishment_id').references('id').inTable('establishments');
                table.string('email').notNullable();
                table.string('password').notNullable();
                table.string('first_name').notNullable();
                table.string('last_name').notNullable();
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.dropTable('users')
  ]);
};
