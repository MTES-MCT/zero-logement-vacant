import { Knex } from 'knex';

const geoCodeChanges = [
  { old: '01039', new: '01138', },
  { old: '02077', new: '02564', },
  { old: '09255', new: '09056', },
  { old: '16140', new: '16206', },
  { old: '50015', new: '50272', },
  { old: '51063', new: '51457', },
  { old: '51637', new: '51457', },
  { old: '71492', new: '71042', },
  { old: '85037', new: '85289', },
  { old: '85053', new: '85289', }
];

export async function seed(knex: Knex): Promise<void> {
  await Promise.all(
    geoCodeChanges.map(async (change) =>
      knex.raw('UPDATE fast_housing SET geo_code = ? WHERE geo_code = ?', [
        change.new,
        change.old
      ])
    )
  );
}
