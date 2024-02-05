// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('auth_tokens', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.uuid('user_id').references('id').inTable('users').notNullable().unique();
                table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
            }),
        knex.schema// @ts-ignore
            .alterTable('users', (table) => {
                table.integer('role');
                table.timestamp('activated_at');
                table.string('password').nullable().alter();
            }),
        knex.raw('update users set ' +
            'role = (case when (establishment_id is null) then 1 else 0 end), ' +
            'activated_at = (case when (password is not null) then current_timestamp end)'),
        knex.schema// @ts-ignore
            .alterTable('users', (table) => {
                table.integer('role').notNullable().alter();
            }),
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.integer('cadastral_classification').nullable().alter();
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
    return Promise.all([
        knex.schema.dropTable('auth_tokens'),
        knex.schema// @ts-ignore
            .alterTable('users', (table) => {
                table.dropColumn('role');
                table.dropColumn('activated_at');
            })
    ]);
};
