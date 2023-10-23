import Stream = Highland.Stream;
import { OwnerApi } from '../../server/models/OwnerApi';
import createDatafoncierOwnersRepository from './datafoncierOwnersRepository';
import { DatafoncierOwner, evaluate, tapAsync, toOwnerApi } from '../shared';
import ownerMatchRepository from '../../server/repositories/ownerMatchRepository';
import { isMatch } from '../shared/owner-processor/duplicates';
import ownerRepository from '../../server/repositories/ownerRepository';
import { logger } from '../../server/utils/logger';

export function ownerImporter(): Stream<OwnerApi> {
  return createDatafoncierOwnersRepository()
    .stream()
    .consume(tapAsync(processOwner))
    .map(toOwnerApi)
    .errors((error) => {
      logger.error(error);
    });
}

/**
 * Link a DataFoncier owner to our owner.
 * @param dfOwner
 */
export async function processOwner(dfOwner: DatafoncierOwner): Promise<void> {
  logger.debug(`Processing ${dfOwner.idpersonne}...`);
  const dfOwnerApi = toOwnerApi(dfOwner);

  const ownerMatch = await ownerMatchRepository.findOne({
    idpersonne: dfOwner.idpersonne,
  });

  if (!ownerMatch) {
    const comparison = await evaluate(dfOwnerApi);
    if (isMatch(comparison.score) && !comparison.needsReview) {
      await ownerMatchRepository.save({
        owner_id: comparison.duplicates[0].value.id,
        idpersonne: dfOwner.idpersonne,
      });
    } else {
      await ownerRepository.save(dfOwnerApi);
      await ownerMatchRepository.save({
        owner_id: dfOwnerApi.id,
        idpersonne: dfOwner.idpersonne,
      });
    }
  }
}

export default ownerImporter;
