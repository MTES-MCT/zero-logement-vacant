import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { usersTable } from '../../server/repositories/userRepository';

const USER_ROLE = 0;
const EMAIL = 'admin@zerologementvacant.beta.gouv.fr';

exports.up = async function (knex: Knex) {
  await knex(usersTable).insert({
    id: uuidv4(),
    email: EMAIL,
    password: '',
    first_name: 'Zéro',
    last_name: 'Logement Vacant',
    role: USER_ROLE,
    activated_at: new Date(),
    updated_at: new Date(),
  });
};

exports.down = async function (knex: Knex) {
  await knex(usersTable)
    .where({
      email: EMAIL,
    })
    .delete();
};
