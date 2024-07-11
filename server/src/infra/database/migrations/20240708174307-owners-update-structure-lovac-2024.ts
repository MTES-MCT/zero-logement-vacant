import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table
      .string('idpersonne')
      .nullable()
      .unique()
      .comment('L’identifiant communal provenant de LOVAC');
    table.string('siren').nullable();
    table.renameColumn('raw_address', 'dgfip_address');
    table.renameColumn('owner_kind', 'kind_class');
    table.string('data_source').nullable();
    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumn('idpersonne');
  });
}
