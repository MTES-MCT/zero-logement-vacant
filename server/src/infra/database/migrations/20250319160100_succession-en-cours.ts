import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('precisions')
    .where('label', 'Succession difficile, indivision en désaccord')
    .update({ label: 'Succession en cours' });
}

export async function down(knex: Knex): Promise<void> {
  await knex('precisions')
    .where('label', 'Succession en cours')
    .update({ label: 'Succession difficile, indivision en désaccord' });
}
