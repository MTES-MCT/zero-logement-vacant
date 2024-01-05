import highland from 'highland';
import { OwnerApi } from '../../server/models/OwnerApi';
import createDatafoncierOwnersRepository from '../../server/repositories/datafoncierOwnersRepository';
import { DatafoncierOwner, evaluate, toOwnerApi } from '../shared';
import OwnerMatchRepository from '../../server/repositories/ownerMatchRepository';
import ownerMatchRepository, {
  OwnerMatchDBO,
} from '../../server/repositories/ownerMatchRepository';
import {
  findDuplicatesByName,
  isMatch,
  isPerfectMatch,
} from '../shared/owner-processor/duplicates';
import { logger } from '../../server/utils/logger';
import OwnerRepository from '../../server/repositories/ownerRepository';
import Stream = Highland.Stream;

export function ownerImporter(
  stream: Stream<DatafoncierOwner> = createDatafoncierOwnersRepository().stream()
) {
  logger.info('Importing owners...');
  return stream
    .flatMap((dfOwner) => highland(processOwner(dfOwner)))
    .filter((result) => !!result.match || !!result.owner)
    .through(save)
    .stopOnError((error) => {
      logger.error(error);
      throw error;
    });
}

interface Result {
  match?: OwnerMatchDBO;
  owner?: OwnerApi;
}

/**
 * Link a DataFoncier owner to our owner.
 * @param dfOwner
 */
export async function processOwner(dfOwner: DatafoncierOwner): Promise<Result> {
  logger.info(`Processing ${dfOwner.idpersonne}...`);
  const dfOwnerApi = toOwnerApi(dfOwner);

  const ownerMatch = await ownerMatchRepository.findOne({
    idpersonne: dfOwner.idpersonne,
  });

  if (!ownerMatch) {
    const duplicates = await findDuplicatesByName(dfOwnerApi);
    const comparison = evaluate(dfOwnerApi, duplicates);

    if (isPerfectMatch(comparison.score)) {
      return {
        match: {
          owner_id: comparison.duplicates[0].value.id,
          idpersonne: dfOwner.idpersonne,
        },
      };
    }

    if (isMatch(comparison.score)) {
      if (!comparison.needsReview) {
        return {
          match: {
            owner_id: comparison.duplicates[0].value.id,
            idpersonne: dfOwner.idpersonne,
          },
        };
      }
    }

    return {
      owner: dfOwnerApi,
      match: {
        owner_id: dfOwnerApi.id,
        idpersonne: dfOwner.idpersonne,
      },
    };
  }

  return {};
}

function save(stream: Stream<Result>): Stream<void> {
  async function saveResult(result: Result): Promise<void> {
    if (result.owner) {
      await OwnerRepository.save(result.owner);
    }

    if (result.match) {
      await OwnerMatchRepository.save(result.match);
    }
  }

  return stream.flatMap((result) => highland(saveResult(result)));
}

export default ownerImporter;
