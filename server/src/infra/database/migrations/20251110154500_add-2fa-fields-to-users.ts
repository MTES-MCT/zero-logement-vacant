import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Secret key for generating OTP (stored securely)
    table.string('two_factor_secret', 255).nullable();

    // Timestamp when 2FA was enabled
    table.timestamp('two_factor_enabled_at', { useTz: true }).nullable();

    // Current OTP code (6 digits) - temporary storage
    table.string('two_factor_code', 6).nullable();

    // Timestamp when the OTP was generated
    table.timestamp('two_factor_code_generated_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('two_factor_secret');
    table.dropColumn('two_factor_enabled_at');
    table.dropColumn('two_factor_code');
    table.dropColumn('two_factor_code_generated_at');
  });
}
