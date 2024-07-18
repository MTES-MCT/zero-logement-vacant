import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.setNullable('subject');
    table.setNullable('body');
    table.setNullable('logo');
    table.setNullable('written_at');
    table.setNullable('written_from');
  });
  await knex.schema.alterTable('senders', (table) => {
    table.setNullable('name');
    table.setNullable('service');
    table.setNullable('first_name');
    table.setNullable('last_name');
    table.setNullable('address');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('drafts').whereNull('subject').update({ subject: '', });
  await knex('drafts').whereNull('body').update({ body: '', });
  await knex('drafts').whereNull('logo').update({ logo: [], });
  await knex('drafts').whereNull('written_at').update({ written_at: '', });
  await knex('drafts').whereNull('written_from').update({ written_from: '', });
  await knex.schema.alterTable('drafts', (table) => {
    table.dropNullable('subject');
    table.dropNullable('body');
    table.dropNullable('logo');
    table.dropNullable('written_at');
    table.dropNullable('written_from');
  });
  await knex('senders').whereNull('name').update({ name: '', });
  await knex('senders').whereNull('service').update({ service: '', });
  await knex('senders').whereNull('first_name').update({ first_name: '', });
  await knex('senders').whereNull('last_name').update({ last_name: '', });
  await knex('senders').whereNull('address').update({ address: '', });
  await knex.schema.alterTable('senders', (table) => {
    table.dropNullable('name');
    table.dropNullable('service');
    table.dropNullable('first_name');
    table.dropNullable('last_name');
    table.dropNullable('address');
  });
}
