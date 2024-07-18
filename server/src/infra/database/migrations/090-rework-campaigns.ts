import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex
    .table('campaigns')
    .update({
      title: knex.raw("'C' || campaign_number"),
    })
    .whereNull('title');
  await knex
    .table('campaigns')
    .update({
      title: knex.raw("title || ' - Relance n°' || reminder_number"),
    })
    .where('reminder_number', '>', 0);

  await knex
    .table('campaign_events')
    .delete()
    .whereExists(
      knex
        .table('campaigns')
        .whereRaw('id = campaign_id')
        .where('campaign_number', 0)
    );
  await knex
    .table('campaigns_housing')
    .delete()
    .whereExists(
      knex
        .table('campaigns')
        .whereRaw('id = campaign_id')
        .where('campaign_number', 0)
    );
  await knex.table('campaigns').delete().where('campaign_number', 0);

  await knex.schema.table('campaigns', (table) => {
    table.renameColumn('campaign_number', 'campaign_number_deprecated');
    table.setNullable('campaign_number_deprecated');
    table.renameColumn('reminder_number', 'reminder_number_deprecated');
    table.setNullable('reminder_number_deprecated');
    table.renameColumn('kind', 'kind_deprecated');
    table.setNullable('kind_deprecated');
    table.dropNullable('title');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('campaigns', (table) => {
    table.renameColumn('campaign_number_deprecated', 'campaign_number');
    table.renameColumn('reminder_number_deprecated', 'reminder_number');
    table.renameColumn('kind_deprecated', 'kind');
    table.setNullable('title');
  });
}
