import { Knex } from 'knex';
import fp from 'lodash/fp';

export async function up(knex: Knex): Promise<void> {
  async function createPartitions(from: number, to: number): Promise<void> {
    for (let i = from; i < to; i++) {
      const department = fp.padCharsStart('0', 2, i.toString(10));
      await knex.schema.raw(`
        CREATE TABLE fast_housing_${department} PARTITION OF fast_housing
        FOR VALUES FROM ('${department}000') TO ('${department}999')
    `);
    }
  }

  await knex.schema.raw(
    'CREATE TABLE fast_housing (LIKE housing) PARTITION BY RANGE (geo_code)'
  );
  await knex.schema.alterTable('fast_housing', (table) => {
    table.integer('status').notNullable().alter();
    table.string('invariant').notNullable().alter();
  });

  await createPartitions(1, 20);
  // Corse-du-Sud
  await knex.schema.raw(`
    CREATE TABLE fast_housing_2A PARTITION OF fast_housing
    FOR VALUES FROM ('2A000') TO ('2A999')
  `);
  // Haute-Corse
  await knex.schema.raw(`
    CREATE TABLE fast_housing_2B PARTITION OF fast_housing
    FOR VALUES FROM ('2B000') TO ('2B999')
  `);
  await createPartitions(21, 99);
  console.info('Housing partitions created.');

  await knex.insert(knex.select().from('housing')).into('fast_housing');
  console.info('Housing copied to the fast_housing partitions.');
  await knex.schema.alterTable('fast_housing', (table) => {
    table.primary(['geo_code', 'id']);
  });

  // Link other tables
  async function addForeignKey(tableName: string): Promise<void> {
    await knex.schema.alterTable(tableName, (table) => {
      table.string('housing_geo_code');
    });
    await knex(tableName).update({
      housing_geo_code: knex
        .select('geo_code')
        .from('housing')
        .where('housing.id', knex.ref(`${tableName}.housing_id`)),
    });
    await knex.schema.alterTable(tableName, (table) => {
      table.string('housing_geo_code').notNullable().alter();
      table
        .foreign(['housing_geo_code', 'housing_id'])
        .references(['geo_code', 'id'])
        .inTable('fast_housing')
        .onUpdate('CASCADE')
        .onDelete('CASCADE');
    });
    console.info(`Added constraints to ${tableName}.`);
  }

  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropPrimary();
    table.dropForeign('housing_id');
    table.dropForeign('owner_id');
    table.dropIndex(
      ['housing_id', 'rank', 'owner_id'],
      'owners_housing_housing_id_rank_owner_id_idx'
    );
    table.dropIndex(['housing_id', 'rank'], 'owners_housing_housing_rank_idx');
  });
  await addForeignKey('owners_housing');
  await knex.schema.alterTable('owners_housing', (table) => {
    table.primary(['owner_id', 'housing_id', 'housing_geo_code']);
    table.foreign('owner_id').references('id').inTable('owners');
    table.index(['housing_id', 'rank', 'owner_id']);
  });
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_housing_housing_rank_owner_idx ON owners_housing (housing_id, rank)
    WHERE (rank = 1);
  `);
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_housing_housing_rank_coowners_idx ON owners_housing (housing_id, rank)
    WHERE (rank > 1);
  `);

  await knex.schema.alterTable('campaigns_housing', (table) => {
    table.dropPrimary();
    table.dropForeign('housing_id', 'campaigns_housing_housing_id_foreign');
  });
  await addForeignKey('campaigns_housing');
  await knex.schema.alterTable('campaigns_housing', (table) => {
    table.primary(['campaign_id', 'housing_id', 'housing_geo_code']);
  });

  await knex.schema.alterTable('housing_events', (table) => {
    table.dropPrimary();
    table.dropForeign('housing_id');
  });
  await addForeignKey('housing_events');
  await knex.schema.alterTable('housing_events', (table) => {
    table.primary(['event_id', 'housing_id', 'housing_geo_code']);
  });

  await knex.schema.alterTable('housing_notes', (table) => {
    table.dropForeign('housing_id');
  });
  await addForeignKey('housing_notes');
  await knex.schema.alterTable('housing_notes', (table) => {
    table.primary(['note_id', 'housing_id', 'housing_geo_code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  function addForeignKey(table: Knex.CreateTableBuilder): void {
    table
      .foreign('housing_id')
      .references('id')
      .inTable('housing')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  }

  await knex
    .insert(knex.select().from('fast_housing'))
    .into('housing')
    .onConflict(['id'])
    .ignore();

  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropPrimary();
    table.dropIndex(
      ['housing_id, rank'],
      'owners_housing_housing_rank_owner_idx'
    );
    table.dropIndex(
      ['housing_id, rank'],
      'owners_housing_housing_rank_coowners_idx'
    );
    table.dropColumn('housing_geo_code');
    addForeignKey(table);
    table.primary(['owner_id', 'housing_id']);
    table.index(
      ['housing_id', 'rank', 'owner_id'],
      'owners_housing_housing_id_rank_owner_id_idx'
    );
  });
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_housing_housing_rank_idx ON owners_housing (housing_id, rank)
    WHERE (rank > 0);
  `);
  await knex.schema.alterTable('campaigns_housing', (table) => {
    table.dropPrimary();
    table.dropColumn('housing_geo_code');
    addForeignKey(table);
    table.primary(['campaign_id', 'housing_id']);
  });
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropPrimary();
    table.dropColumn('housing_geo_code');
    addForeignKey(table);
    table.primary(['event_id', 'housing_id']);
  });
  await knex.schema.alterTable('housing_notes', (table) => {
    table.dropPrimary();
    table.dropColumn('housing_geo_code');
    addForeignKey(table);
    // There was no primary key before the migration
  });

  await knex.schema.dropTable('fast_housing');
}
