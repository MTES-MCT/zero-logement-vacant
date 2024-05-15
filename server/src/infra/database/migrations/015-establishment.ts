import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('establishments', (table) => {
      table.renameColumn('epci_id', 'siren');
    }),
    knex.raw(
      "update establishments set siren = '212000046' where name = 'Commune d''Ajaccio'",
    ),
    knex.raw(
      "update establishments set siren = '211903109' where name = 'Commune de Brive-la-Gaillarde'",
    ),
    knex.raw(
      "update establishments set siren = '221800014' where name = 'Département du Cher'",
    ),
    knex.raw(
      "update establishments set siren = '216802249' where name = 'Commune de Mulhouse'",
    ),
    knex.raw(
      "update establishments set siren = '200060176' where name = 'Commune de Vire Normandie'",
    ),
    knex.raw(
      "update establishments set siren = '215905126' where name = 'Commune de Roubaix'",
    ),
    knex.raw(
      "update establishments set siren = '225500016' where name = 'Département de la Meuse'",
    ),
    knex.raw(
      "update establishments set siren = '219722097' where name = 'Commune de Fort de France'",
    ),
    knex.raw(
      "update establishments set siren = '341096394' where name = 'ADIL du Doubs'",
    ),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('establishments', (table) => {
      table.renameColumn('siren', 'epci_id');
    }),
  ]);
}
