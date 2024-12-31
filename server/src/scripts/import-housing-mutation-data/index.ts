import async from 'async';
import { Range } from 'immutable';
import fp from 'lodash/fp';

import db from '~/infra/database';

const BATCH_SIZE = 1_000;
const LIMIT = 10;

const HOUSINGS_GOLD = 'housings_gold';

async function run(): Promise<void> {
  async function update(
    department: string,
    ids: ReadonlyArray<string>
  ): Promise<void> {
    console.log(
      `Updating ${ids.length} housings in department ${department}...`
    );
    const fastHousing = `fast_housing_${department.toLowerCase()}`;
    const chunks = fp.chunk(BATCH_SIZE, ids);
    await async.forEachLimit(chunks, LIMIT, async (chunk) => {
      await db(fastHousing)
        .update({
          plot_area: db.ref(`${HOUSINGS_GOLD}.plot_area`),
          cadastral_classification: db.ref(
            `${HOUSINGS_GOLD}.cadastral_classification`
          ),
          latitude_dgfip: db.ref(`${HOUSINGS_GOLD}.latitude`),
          longitude_dgfip: db.ref(`${HOUSINGS_GOLD}.longitude`),
          last_mutation_date: db.ref(`${HOUSINGS_GOLD}.last_mutation_date`),
          last_transaction_date: db.ref(
            `${HOUSINGS_GOLD}.last_transaction_date`
          ),
          last_transaction_value: db.ref(
            `${HOUSINGS_GOLD}.last_transaction_value`
          ),
          occupancy_history: db.ref(`${HOUSINGS_GOLD}.occupancy_history`)
        })
        .updateFrom(HOUSINGS_GOLD)
        .where(`${fastHousing}.local_id`, db.ref(`${HOUSINGS_GOLD}.local_id`))
        .whereIn(`${HOUSINGS_GOLD}.local_id`, chunk);
    });
  }

  const departments = Range(1, 99)
    .filter((department) => department !== 20)
    .map((department) => department.toString().padStart(2, '0'))
    .concat(['2A', '2B']);

  await async.forEachSeries(
    departments.toArray(),
    async (department: string) => {
      const housings = await db(HOUSINGS_GOLD)
        .select('local_id')
        .whereLike('local_id', `${department}%`)
        .orderBy('local_id');
      const ids = housings.map((housing) => housing.local_id);
      await update(department, ids);
    }
  );
}

run();
