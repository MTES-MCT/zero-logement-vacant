// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .createTable('housing', (table) => {
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('invariant').notNullable();
                table.string('raw_address').notNullable();
                table.string('house_number');
                table.string('street');
                table.string('postal_code');
                table.string('city');
                table.string('latitude').notNullable();
                table.string('longitude').notNullable();
                table.integer('cadastral_classification').notNullable();
                table.boolean('uncomfortable').notNullable();
                table.string('vacancy_start_year').notNullable();
                table.string('housing_kind').notNullable();
                table.integer('rooms_count').notNullable();
                table.integer('living_area').notNullable();
                table.string('cadastral_reference').notNullable();
                table.string('building_year');
                table.date('mutation_date').notNullable();
                table.boolean('taxed').notNullable();
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema.dropTable('housing')
  ]);
};
