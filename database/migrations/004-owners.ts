// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('owners', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('full_name').notNullable();
                table.string('administrator');
                table.specificType('raw_address', 'text[]').notNullable();
                table.string('owner_kind').notNullable();
                table.string('owner_kind_detail').notNullable();
                table.integer('beneficiary_count')
                table.specificType('invariants', 'text[]').notNullable();
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.dropTable('owners')
  ]);
};
