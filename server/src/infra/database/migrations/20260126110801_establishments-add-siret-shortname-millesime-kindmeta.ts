import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    // SIRET: 14-digit identifier (SIREN + NIC)
    table.string('siret', 14).nullable();

    // Short name: computed from name (e.g., "Paris" instead of "Commune de Paris")
    table.string('short_name', 255).nullable();

    // Millesime: year/vintage of the data source
    table.string('millesime', 4).nullable();

    // Kind admin meta: metadata about the kind (e.g., "Collectivité Territoriale", "EPCI", etc.)
    table.string('kind_admin_meta', 50).nullable();

    // Layer geo label: geographic layer label
    table.string('layer_geo_label', 100).nullable();

    // Department info
    table.string('dep_code', 3).nullable();
    table.string('dep_name', 100).nullable();

    // Region info
    table.string('reg_code', 3).nullable();
    table.string('reg_name', 100).nullable();

    // Add index on siret for lookups
    table.index('siret');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.dropIndex('siret');
    table.dropColumn('siret');
    table.dropColumn('short_name');
    table.dropColumn('millesime');
    table.dropColumn('kind_admin_meta');
    table.dropColumn('layer_geo_label');
    table.dropColumn('dep_code');
    table.dropColumn('dep_name');
    table.dropColumn('reg_code');
    table.dropColumn('reg_name');
  });
}
