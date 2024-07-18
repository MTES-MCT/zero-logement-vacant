import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema
    .createTable('ban_addresses', (table) => {
      table.uuid('ref_id');
      table.string('address_kind');
      table.string('house_number');
      table.string('street');
      table.string('postal_code');
      table.string('city');
      table.double('latitude').nullable();
      table.double('longitude').nullable();
      table.double('score').nullable();
      table.timestamp('last_updated_at');
      table.primary(['ref_id', 'address_kind']);
    })
    .then(() =>
      Promise.all([
        knex.raw(
          "insert into ban_addresses (ref_id, address_kind, house_number, street, postal_code, city) select id, 'Housing', house_number, street, postal_code, city from housing where postal_code is not null"
        ),
        knex.raw(
          "insert into ban_addresses (ref_id, address_kind, house_number, street, postal_code, city) select id, 'Owner', house_number, street, postal_code, city from owners where postal_code is not null"
        )
      ]).then(() =>
        Promise.all([
          knex.schema.alterTable('housing', (table: CreateTableBuilder) => {
            table.dropColumn('house_number');
            table.dropColumn('street');
            table.dropColumn('postal_code');
            table.dropColumn('city');
          }),
          knex.schema.alterTable('owners', (table: CreateTableBuilder) => {
            table.dropColumn('house_number');
            table.dropColumn('street');
            table.dropColumn('postal_code');
            table.dropColumn('city');
          }),
          knex.schema.alterTable('housing', (table) => {
            table.renameColumn('latitude', 'latitude_old');
            table.renameColumn('longitude', 'latitude');
            table.renameColumn('latitude_old', 'longitude');
          })
        ])
      )
    );
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table: CreateTableBuilder) => {
      table.string('house_number');
      table.string('street');
      table.string('postal_code');
      table.string('city');
    }),
    knex.schema.alterTable('owners', (table) => {
      table.string('house_number');
      table.string('street');
      table.string('postal_code');
      table.string('city');
    })
  ])
    .then(() =>
      Promise.all([
        knex.raw(
          'update housing set house_number = a.house_number, street = a.street, postal_code = a.postal_code, city = a.city from (select * from ban_addresses a) as a where a.ref_id = id'
        ),
        knex.raw(
          'update owners set house_number = a.house_number, street = a.street, postal_code = a.postal_code, city = a.city from (select * from ban_addresses a) as a where a.ref_id = id'
        )
      ])
    )
    .then(() => knex.schema.dropTable('ban_addresses'));
}
