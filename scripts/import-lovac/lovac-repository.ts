import highland from 'highland';

import { HousingApi } from '../../server/models/HousingApi';
import db from '../../server/repositories/db';
import { housingTable } from '../../server/repositories/housingRepository';

const table = 'lovac';

async function findOne(): Promise<HousingApi | null> {
  // TODO
  return null;
}

function stream(): Highland.Stream<HousingApi> {
  const stream = db(table).stream();
  return highland(stream);
}

function streamNewHousing(): Highland.Stream<HousingApi> {
  const stream = db(table)
    .leftJoin(housingTable, `${table}.invariant`, `${housingTable}.invariant`)
    .whereNull(`${housingTable}.invariant`)
    .stream();
  return highland(stream);
}

const lovacRepository = {
  findOne,
  stream,
  streamNewHousing,
};

export default lovacRepository;
