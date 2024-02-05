import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  // Create the table
  await knex.schema.createTable('establishments_localities', (table) => {
    table.uuid('locality_id').notNullable();
    table.uuid('establishment_id').notNullable();
  });

  // Fill up with data
  await knex
    .table('establishments_localities')
    .insert(
      knex
        .select('localities.id', 'establishments.id')
        .from('localities')
        .join(
          'establishments',
          knex.raw(
            'localities.geo_code = ANY(establishments.localities_geo_code)'
          )
        )
    );

  // Add foreign keys and indexes
  await knex.schema.alterTable('establishments_localities', (table) => {
    table
      .uuid('locality_id')
      .references('id')
      .inTable('localities')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .alter();
    table
      .uuid('establishment_id')
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .alter();
    table.primary(['establishment_id', 'locality_id']);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('establishments_localities');
};
