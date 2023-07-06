import csv from 'csv-parse';
import fs from 'fs';
import highland from 'highland';

import { OwnerStreamRepository, StreamOptions } from './ownerStreamRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import {
  geoCode,
  nature,
  NonVacantHousing,
  nonVacantHousingSchema,
  occupancy,
} from './NonVacantHousing';
import { logger } from '../../server/utils/logger';
import validator from './validator';
import ownerRepository from '../../server/repositories/ownerRepository';
import Stream = Highland.Stream;

class OwnerFileRepository implements OwnerStreamRepository {
  constructor(private file: string) {}

  stream(opts: StreamOptions): Stream<OwnerApi> {
    logger.debug('Stream owners from file', {
      file: this.file,
      options: opts,
    });

    return highland<NonVacantHousing>(fs.createReadStream(this.file, 'utf8'))
      .through(
        csv.parse({
          delimiter: ';',
        })
      )
      .filter(occupancy('L'))
      .filter(nature('MAISON', 'APPARTEMENT'))
      .filter(geoCode(...opts.geoCodes))
      .map(validator.validate(nonVacantHousingSchema))
      .flatMap((housing) => highland(fetchOwners(housing)))
      .flatten();
  }
}

async function fetchOwners(housing: NonVacantHousing): Promise<OwnerApi[]> {
  await Promise.all([
    ownerRepository.findOne({
      fullName: housing.ff_ddenom_1,
      rawAddress: [
        housing.ff_dlign_3_1,
        housing.ff_dlign_4_1,
        housing.ff_dlign_5_1,
        housing.ff_dlign_6_1,
      ],
      birthDate: new Date(housing.ff_jdatnss_1),
    }),
  ]);
  // TODO
  await ownerRepository.findOne({});
  return [];
}

function createOwnerFileStream(file: string): OwnerStreamRepository {
  return new OwnerFileRepository(file);
}

export default createOwnerFileStream;
