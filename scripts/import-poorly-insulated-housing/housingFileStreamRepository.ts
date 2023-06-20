import csv from 'csv-parse';
import fs from 'fs';
import highland from 'highland';

import { HousingApi } from '../../server/models/HousingApi';
import {
  HousingStreamRepository,
  StreamOptions,
} from '../../server/repositories/housingStreamRepository';
import {
  geoCode,
  nature,
  NonVacantHousing,
  nonVacantHousingSchema,
  occupancy,
  toHousingApi,
} from './NonVacantHousing';
import validator from './validator';

class HousingFileStreamRepository implements HousingStreamRepository {
  constructor(private file: string) {}

  stream(opts: StreamOptions): Highland.Stream<HousingApi> {
    return highland<NonVacantHousing>(fs.createReadStream(this.file, 'utf8'))
      .through(
        csv.parse({
          delimiter: ';',
          columns: true,
        })
      )
      .filter(occupancy('L'))
      .filter(nature('MAISON', 'APPARTEMENT'))
      .filter(geoCode(...opts.geoCodes))
      .map(validator.validate(nonVacantHousingSchema))
      .map(toHousingApi);
  }
}

// function geoCode(...geoCodes: string[]) {
//   const set = new Set(geoCodes);
//
//   return (housing: HousingDTO): boolean => {
//     const department = lodash.padStart(housing.ccodep, 2, '0');
//     const city = lodash.padStart(housing.commune, 3, '0');
//     const geoCode = `${department}${city}`;
//     return set.has(geoCode);
//   };
// }

function createHousingFileStream(file: string): HousingStreamRepository {
  return new HousingFileStreamRepository(file);
}

export default createHousingFileStream;
