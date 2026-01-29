import { Knex } from 'knex';

/**
 * Create users_establishments junction table for multi-structure support.
 *
 * This table allows users to be associated with multiple establishments
 * when they have LOVAC access on multiple structures in Portail DF.
 *
 * The existing users.establishment_id column remains as the "current"
 * or "primary" establishment for the user.
 */
export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('users_establishments');

  if (!exists) {
    await knex.schema.createTable('users_establishments', (table) => {
      table.uuid('user_id').notNullable()
        .references('id').inTable('users')
        .onUpdate('CASCADE')
        .onDelete('CASCADE');

      table.uuid('establishment_id').notNullable()
        .references('id').inTable('establishments')
        .onUpdate('CASCADE')
        .onDelete('CASCADE');

      // Store the SIREN for quick lookups without join to establishments
      table.string('establishment_siren', 9).notNullable();

      // Whether this establishment has valid LOVAC commitment
      table.boolean('has_commitment').notNullable().defaultTo(false);

      // Timestamps
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      // Composite primary key
      table.primary(['user_id', 'establishment_id']);

      // Index for quick user lookups
      table.index(['user_id']);

      // Index for quick establishment lookups
      table.index(['establishment_id']);
    });
  }

  // Migrate existing user-establishment relationships
  // This populates the junction table with existing relationships
  // Use ON CONFLICT DO NOTHING to be idempotent
  await knex.raw(`
    INSERT INTO users_establishments (user_id, establishment_id, establishment_siren, has_commitment)
    SELECT
      u.id as user_id,
      u.establishment_id,
      e.siren as establishment_siren,
      true as has_commitment
    FROM users u
    INNER JOIN establishments e ON u.establishment_id = e.id
    WHERE u.establishment_id IS NOT NULL
    AND u.deleted_at IS NULL
    ON CONFLICT (user_id, establishment_id) DO NOTHING
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users_establishments');
}
