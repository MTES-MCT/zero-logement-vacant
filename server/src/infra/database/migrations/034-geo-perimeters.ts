import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.renameTable('housing_scopes_geom', 'geo_perimeters'),
    knex.schema.alterTable('geo_perimeters', (table) => {
      table.dropColumn('gid');
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.uuid('created_by').references('id').inTable('users');
      table.renameColumn('type', 'kind');
    }),
    knex.raw(
      "update campaigns set filters = jsonb_set(filters::jsonb, '{geoPerimetersIncluded}', filters::jsonb#>'{housingScopesIncluded}') - 'housingScopesIncluded'",
    ),
    knex.raw(
      "update campaigns set filters = jsonb_set(filters::jsonb, '{geoPerimetersExcluded}', filters::jsonb#>'{housingScopesExcluded}') - 'housingScopesExcluded'",
    ),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.renameTable('geo_perimeters', 'housing_scopes_geom'),
    knex.schema.alterTable('housing_scopes_geom', (table) => {
      table.dropColumn('created_by');
      table.dropColumn('created_at');
      table.dropColumn('id');
      table.specificType('gid', 'serial').primary();
      table.renameColumn('kind', 'type');
    }),
    knex.raw(
      "update campaigns set filters = jsonb_set(filters::jsonb, '{housingScopesIncluded}', filters::jsonb#>'{geoPerimetersIncluded}') - 'geoPerimetersIncluded'",
    ),
    knex.raw(
      "update campaigns set filters = jsonb_set(filters::jsonb, '{housingScopesExcluded}', filters::jsonb#>'{geoPerimetersExcluded}') - 'geoPerimetersExcluded'",
    ),
  ]);
}
