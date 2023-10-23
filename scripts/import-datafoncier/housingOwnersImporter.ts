import Stream = Highland.Stream;
import { HousingRecordApi } from '../../server/models/HousingApi';
import createDatafoncierHousingRepository from './datafoncierHousingRepository';
import { DatafoncierHousing, tapAsync, toHousingRecordApi } from '../shared';
import housingRepository from '../../server/repositories/housingRepository';
import HousingMissingError from '../../server/errors/housingMissingError';
import ownerRepository from '../../server/repositories/ownerRepository';
import createDatafoncierOwnersRepository from './datafoncierOwnersRepository';
import {
  HousingOwnerApi,
  includeSameHousingOwners,
  toHousingOwnersApi,
} from '../../server/models/HousingOwnerApi';
import housingOwnerRepository from '../../server/repositories/housingOwnerRepository';
import HousingOwnersDifferentError from '../../server/errors/housingOwnersDifferentError';
import { logger } from '../../server/utils/logger';

const datafoncierOwnersRepository = createDatafoncierOwnersRepository();

export function housingOwnersImporter(): Stream<HousingRecordApi> {
  return createDatafoncierHousingRepository()
    .stream()
    .consume(tapAsync(processHousingOwners))
    .map(toHousingRecordApi)
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
    datafoncierOwnersRepository.findOwners(datafoncierHousing),
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

  if (!includeSameHousingOwners(datafoncierHousingOwners, housingOwners)) {
    throw new HousingOwnersDifferentError(
      datafoncierHousingOwners,
      housingOwners
    );
  }
}

export default housingOwnersImporter;
