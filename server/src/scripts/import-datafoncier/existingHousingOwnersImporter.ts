import { Presets, SingleBar } from 'cli-progress';
import { HousingApi } from '~/models/HousingApi';
import housingRepository from '~/repositories/housingRepository';
import { tapAsync } from '../shared';
import createDatafoncierOwnersRepository from '~/repositories/datafoncierOwnersRepository';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import { logger } from '~/infra/logger';
import ownerRepository from '~/repositories/ownerRepository';
import {
  equals,
  HousingOwnerApi,
  MAX_OWNERS,
  toHousingOwnersApi,
} from '~/models/HousingOwnerApi';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import { HousingOwnerConflictApi } from '~/models/ConflictApi';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import { isNotNull } from '@zerologementvacant/shared';
import housingOwnerConflictRepository from '~/repositories/conflict/housingOwnerConflictRepository';
import Stream = Highland.Stream;

let totalHousingOwnersCount = 0;

let progressBar: SingleBar;

export async function existingHousingOwnersImporter(
  progressBarHousingOwners: SingleBar,
): Promise<Stream<HousingApi>> {
  logger.info('Importing housing owners...');

  progressBar = progressBarHousingOwners;

  const result = await housingRepository.count({});

  totalHousingOwnersCount = result.housing;
  progressBar.start(totalHousingOwnersCount, 0);

  return housingRepository
    .stream({
      filters: {},
      includes: ['owner'],
    })
    .consume(tapAsync(processHousing))
    .errors((error) => {
      logger.error(error);
    });
}

const datafoncierHousingRepository = createDatafoncierHousingRepository();
const datafoncierOwnersRepository = createDatafoncierOwnersRepository();

export async function processHousing(housing: HousingApi): Promise<void> {
  if (!progressBar) {
    progressBar = new SingleBar({}, Presets.shades_classic);
  }
  progressBar.increment();

  const datafoncierHousing = await datafoncierHousingRepository.findOne({
    idlocal: housing.localId,
    ccthp: 'L',
  });
  if (!datafoncierHousing) {
    logger.debug(
      `No datafoncier housing found for idlocal ${housing.localId}. Skipping...`,
    );
    return;
  }

  logger.debug(`Found datafoncier housing for idlocal ${housing.localId}`);
  const [datafoncierOwners, housingOwners] = await Promise.all([
    datafoncierOwnersRepository.find({
      filters: {
        idprocpte: datafoncierHousing.idprocpte,
      },
    }),
    ownerRepository.findByHousing(housing),
  ]);
  const datafoncierHousingOwners: HousingOwnerApi[] = toHousingOwnersApi(
    housing,
    datafoncierOwners,
  );

  // This is a new housing that had no owner yet
  if (!housingOwners.length) {
    await housingOwnerRepository.saveMany(datafoncierHousingOwners);
    return;
  }

  const conflicts: HousingOwnerConflictApi[] = fp
    .range(1, MAX_OWNERS + 1)
    .map<HousingOwnerConflictApi | null>((i) => {
      const housingOwner: HousingOwnerApi | undefined = housingOwners[i - 1];
      const datafoncierHousingOwner: HousingOwnerApi | undefined =
        datafoncierHousingOwners[i - 1];

      if (!equals(housingOwner, datafoncierHousingOwner)) {
        const conflict: HousingOwnerConflictApi = {
          id: uuidv4(),
          createdAt: new Date(),
          housingId: housing.id,
          housingGeoCode: housing.geoCode,
          existing: housingOwner,
          replacement: datafoncierHousingOwner,
        };
        return conflict;
      }
      return null;
    })
    .filter(isNotNull);
  await housingOwnerConflictRepository.saveMany(conflicts);
}
