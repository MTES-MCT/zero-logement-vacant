import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('fast_housing')
    .where('sub_status', 'Mutation en cours')
    .update({ 'sub_status': 'Mutation en cours ou effectuée' });
}

export async function down(knex: Knex): Promise<void> {
  await knex('fast_housing')
    .where('sub_status', 'Mutation en cours ou effectuée')
    .update({ 'sub_status' : 'Mutation en cours' });
}
