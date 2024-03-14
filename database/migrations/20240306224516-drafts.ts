import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('drafts', (table) => {
    table.uuid('id').primary();
    table.text('body').nullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at').notNullable();
    table
      .uuid('establishment_id')
      .notNullable()
      .references('id')
      .inTable('establishments')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .comment('The establishment to which the draft belongs');
  });

  await knex.schema.createTable('campaigns_drafts', (table) => {
    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('draft_id')
      .notNullable()
      .references('id')
      .inTable('drafts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.primary(['campaign_id', 'draft_id']);
  });

  await knex('drafts').insert(
    knex('campaigns').select({
      id: knex.raw('gen_random_uuid()'),
      body: knex.raw('NULL'),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      establishment_id: knex.ref('campaigns.establishment_id'),
    })
  );

  await knex('campaigns_drafts').insert(
    knex.raw(`
      SELECT
        ordered_campaigns.id AS campaign_id,
        ordered_drafts.id AS draft_id
      FROM
        (SELECT *, ROW_NUMBER() OVER (ORDER BY establishment_id) AS row FROM campaigns) AS ordered_campaigns
      JOIN
        (SELECT *, ROW_NUMBER() OVER (ORDER BY establishment_id) AS row FROM drafts) AS ordered_drafts
      ON
        ordered_campaigns.row = ordered_drafts.row
    `)
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('campaigns_drafts');
  await knex.schema.dropTable('drafts');
}
