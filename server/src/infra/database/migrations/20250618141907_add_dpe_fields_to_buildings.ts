import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('buildings', function(table) {
    table.text('dpe_id');
    table.text('class_dpe');
    table.text('class_ges');
    table.date('dpe_date_at');
    table.text('dpe_type');
    table.text('heating_building');
    table.text('dpe_import_match');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('buildings', function(table) {
    table.dropColumn('dpe_id');
    table.dropColumn('class_dpe');
    table.dropColumn('class_ges');
    table.dropColumn('dpe_date_at');
    table.dropColumn('dpe_type');
    table.dropColumn('heating_building');
    table.dropColumn('dpe_import_match');
  });
}
