import { HousingApi } from '../../server/models/HousingApi';
import housingRepository from '../../server/repositories/housingRepository';
import { tapAsync } from '../shared';
import createDatafoncierOwnersRepository from './datafoncierOwnersRepository';
import createDatafoncierHousingRepository from './datafoncierHousingRepository';
import { logger } from '../../server/utils/logger';
import HousingMissingError from '../../server/errors/housingMissingError';
import ownerRepository from '../../server/repositories/ownerRepository';
import {
  equals,
  HousingOwnerApi,
  MAX_OWNERS,
  toHousingOwnersApi,
} from '../../server/models/HousingOwnerApi';
import housingOwnerRepository from '../../server/repositories/housingOwnerRepository';
import { HousingOwnerConflictApi } from '../../server/models/ConflictApi';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import { isNotNull } from '../../shared';
import housingOwnerConflictRepository from '../../server/repositories/conflict/housingOwnerConflictRepository';
import Stream = Highland.Stream;

export function existingHousingOwnersImporter(): Stream<HousingApi> {
  logger.info('Importing housing owners...');
  return housingRepository
    .stream({
      filters: {},
    })
    .consume(tapAsync(processHousing))
    .errors((error) => {
      logger.error(error);
    });
}

const datafoncierHousingRepository = createDatafoncierHousingRepository();
const datafoncierOwnersRepository = createDatafoncierOwnersRepository();

export async function processHousing(housing: HousingApi): Promise<void> {
  const datafoncierHousing = await datafoncierHousingRepository.findOne({
    idlocal: housing.localId,
  });
  if (!datafoncierHousing) {
    throw new HousingMissingError(housing.localId);
  }

  const [datafoncierOwners, housingOwners] = await Promise.all([
    datafoncierOwnersRepository.findOwners(datafoncierHousing),
    ownerRepository.findByHousing(housing),
  ]);
  const datafoncierHousingOwners: HousingOwnerApi[] = toHousingOwnersApi(
    housing,
    datafoncierOwners
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
        return {
          id: uuidv4(),
          createdAt: new Date(),
          existing: housingOwner,
          replacement: datafoncierHousingOwner,
        } as HousingOwnerConflictApi;
      }
      return null;
    })
    .filter(isNotNull);
  await housingOwnerConflictRepository.saveMany(conflicts);
}
