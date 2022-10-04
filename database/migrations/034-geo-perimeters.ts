// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .renameTable('housing_scopes_geom', 'geo_perimeters'),
        knex.schema// @ts-ignore
            .alterTable('geo_perimeters', (table) => {
                table.dropColumn('gid');
                table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            }),
        knex.raw("update campaigns set filters = jsonb_set(filters::jsonb, '{geoPerimetersIncluded}', filters::jsonb#>'{housingScopesIncluded}') - 'housingScopesIncluded'"),
        knex.raw("update campaigns set filters = jsonb_set(filters::jsonb, '{geoPerimetersExcluded}', filters::jsonb#>'{housingScopesExcluded}') - 'housingScopesExcluded'")
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema// @ts-ignore
          .renameTable('geo_perimeters', 'housing_scopes_geom'),
      knex.schema// @ts-ignore
          .alterTable('housing_scopes_geom', (table) => {
              table.dropColumn('id');
              table.specificType('gid', 'serial').primary();
          }),
      knex.raw("update campaigns set filters = jsonb_set(filters::jsonb, '{housingScopesIncluded}', filters::jsonb#>'{geoPerimetersIncluded}') - 'geoPerimetersIncluded'"),
      knex.raw("update campaigns set filters = jsonb_set(filters::jsonb, '{housingScopesExcluded}', filters::jsonb#>'{geoPerimetersExcluded}') - 'geoPerimetersExcluded'")
  ]);
};
