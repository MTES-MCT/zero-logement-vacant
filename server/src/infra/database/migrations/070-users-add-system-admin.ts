import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

const USER_ROLE = 0;
const EMAIL = 'admin@zerologementvacant.beta.gouv.fr';

export async function up(knex: Knex): Promise<void> {
  await knex('users').insert({
    id: uuidv4(),
    email: EMAIL,
    password: '',
    first_name: 'Zéro',
    last_name: 'Logement Vacant',
    role: USER_ROLE,
    activated_at: new Date(),
    updated_at: new Date(),
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('users')
    .where({
      email: EMAIL,
    })
    .delete();
}
