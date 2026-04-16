import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates the system admin account used by import scripts (e.g. import-lovac).
 */
export async function seed(knex: Knex): Promise<void> {
  const email = 'system@test.test';

  await knex('users')
    .insert({
      id: uuidv4(),
      email,
      password: '',
      first_name: null,
      last_name: null,
      establishment_id: null,
      role: 1,
      activated_at: new Date(),
      last_authenticated_at: null,
      suspended_at: null,
      suspended_cause: null,
      deleted_at: null,
      updated_at: new Date(),
      phone: null,
      position: null,
      time_per_week: null,
      kind: null,
      two_factor_secret: null,
      two_factor_enabled_at: null,
      two_factor_code: null
    })
    .onConflict('email')
    .ignore();
}
