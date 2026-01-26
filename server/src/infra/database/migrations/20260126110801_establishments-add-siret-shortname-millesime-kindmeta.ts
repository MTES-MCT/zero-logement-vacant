import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    // SIRET: 14-digit identifier (SIREN + NIC)
    table.string('siret', 14).nullable();

    // Short name: computed from name (e.g., "Paris" instead of "Commune de Paris")
    table.string('short_name', 255).nullable();

    // Millesime: year/vintage of the data source
    table.string('millesime', 4).nullable();

    // Kind meta: metadata about the kind (e.g., "COM", "EPCI", "CC", "CA", "CU", "MET")
    table.string('kind_meta', 50).nullable();

    // Add index on siret for lookups
    table.index('siret');
  });

  // Populate short_name for existing communes
  await knex.raw(`
    UPDATE establishments
    SET short_name = CASE
      WHEN kind IN ('COM', 'COM-TOM', 'Commune') THEN regexp_replace(name, '^Commune d(e\\s|'')', '')
      ELSE name
    END
    WHERE short_name IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.dropIndex('siret');
    table.dropColumn('siret');
    table.dropColumn('short_name');
    table.dropColumn('millesime');
    table.dropColumn('kind_meta');
  });
}
