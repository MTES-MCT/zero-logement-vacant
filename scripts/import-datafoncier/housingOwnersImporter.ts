import Stream = Highland.Stream;
import { v4 as uuidv4 } from 'uuid';
import { HousingRecordApi } from '../../server/models/HousingApi';
import createDatafoncierHousingRepository from '../../server/repositories/datafoncierHousingRepository';
import { tapAsync, toHousingRecordApi } from '../shared';
import housingRepository from '../../server/repositories/housingRepository';
import HousingMissingError from '../../server/errors/housingMissingError';
import ownerRepository from '../../server/repositories/ownerRepository';
import createDatafoncierOwnersRepository from '../../server/repositories/datafoncierOwnersRepository';
import {
  equals,
  HousingOwnerApi,
  MAX_OWNERS,
  toHousingOwnersApi,
} from '../../server/models/HousingOwnerApi';
import housingOwnerRepository from '../../server/repositories/housingOwnerRepository';
import { logger } from '../../server/utils/logger';
import { HousingOwnerConflictApi } from '../../server/models/ConflictApi';
import housingOwnerConflictRepository from '../../server/repositories/conflict/housingOwnerConflictRepository';
import fp from 'lodash/fp';
import { DatafoncierHousing, isNotNull } from '../../shared';

const datafoncierOwnersRepository = createDatafoncierOwnersRepository();

export function housingOwnersImporter(): Stream<HousingRecordApi> {
  return createDatafoncierHousingRepository()
    .stream()
    .consume(tapAsync(processHousingOwners))
    .map(toHousingRecordApi({ source: 'datafoncier-import' }))
    .errors((error) => {
      logger.error(error);
    });
}

export async function processHousingOwners(
  datafoncierHousing: DatafoncierHousing
): Promise<void> {
  const housing = await housingRepository.findOne({
    geoCode: datafoncierHousing.idcom,
    localId: datafoncierHousing.idlocal,
  });
  if (!housing) {
    throw new HousingMissingError();
  }

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
    datafoncierOwners
  );

  // TODO: there should always be at least one datafoncier owner

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

export default housingOwnersImporter;
