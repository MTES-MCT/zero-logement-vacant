import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create or replace the immutable unaccent helper function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
    RETURNS text
    IMMUTABLE
    PARALLEL SAFE
    LANGUAGE sql AS $$
      SELECT public.unaccent($1);
    $$;
  `);

  // Add the generated tsvector column for full_name
  await knex.raw(`
    ALTER TABLE owners
    ADD COLUMN full_name_fts tsvector
    GENERATED ALWAYS AS (
      to_tsvector(
        'simple',
        immutable_unaccent(lower(full_name))
      )
    ) STORED;
  `);

  // Create a GIN index on the generated column
  await knex.raw(`
    CREATE INDEX owners_full_name_fts_idx
    ON owners
    USING gin (full_name_fts);
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the GIN index
  await knex.raw(`
    DROP INDEX IF EXISTS owners_full_name_fts_idx;
  `);

  // Remove the generated column
  await knex.raw(`
    ALTER TABLE owners
    DROP COLUMN IF EXISTS full_name_fts;
  `);

  // Drop the helper function
  await knex.raw(`
    DROP FUNCTION IF EXISTS public.immutable_unaccent(text);
  `);
}
