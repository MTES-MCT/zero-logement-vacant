import { faker } from '@faker-js/faker/locale/fr';
import { UserRole } from '@zerologementvacant/models';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import type { UserDBO } from '~/repositories/userRepository';

const USERS_TABLE = 'users';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`TRUNCATE TABLE ${USERS_TABLE} CASCADE`);

  const system: UserDBO = {
    id: uuidv4(),
    email: config.app.system,
    password: faker.internet.password({ length: 20 }),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    establishment_id: null,
    role: UserRole.ADMIN,
    position: null,
    suspended_at: null,
    suspended_cause: null,
    time_per_week: null,
    kind: null,
    phone: null,
    two_factor_code: null,
    two_factor_code_generated_at: null,
    two_factor_enabled_at: null,
    two_factor_failed_attempts: 0,
    two_factor_locked_until: null,
    two_factor_secret: null,
    last_authenticated_at: null,
    activated_at: new Date(),
    updated_at: new Date(),
    deleted_at: null
  };

  await knex(USERS_TABLE).insert(system);
}
