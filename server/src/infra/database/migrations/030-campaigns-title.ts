import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.text('title');
    }),
    knex.raw(
      'update campaigns c1 set kind = (\n' +
        '    select c2.kind\n' +
        '    from campaigns c2\n' +
        '    where c1.campaign_number = c2.campaign_number\n' +
        '    and c1.establishment_id = c2.establishment_id\n' +
        '    and c2.reminder_number = 0\n' +
        ')\n' +
        'where c1.kind = 1\n' +
        '  and c1.reminder_number > 0'
    ),
    knex.raw('update campaigns set kind = kind - 1 where kind > 1')
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.dropColumn('title');
    })
  ]);
}
