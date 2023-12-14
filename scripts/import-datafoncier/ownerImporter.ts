import highland from 'highland';
import { OwnerApi } from '../../server/models/OwnerApi';
import createDatafoncierOwnersRepository from '../../server/repositories/datafoncierOwnersRepository';
import { DatafoncierOwner, evaluate, toOwnerApi } from '../shared';
import OwnerMatchRepository, {
  OwnerMatchDBO,
} from '../../server/repositories/ownerMatchRepository';
import {
  findDuplicatesByName,
  isMatch,
  isPerfectMatch,
} from '../shared/owner-processor/duplicates';
import { logger } from '../../server/utils/logger';
import { isDefined } from '../../shared';
import OwnerRepository from '../../server/repositories/ownerRepository';
import Stream = Highland.Stream;
import ownerMatchRepository from '../../server/repositories/ownerMatchRepository';

export function ownerImporter(
  stream: Stream<DatafoncierOwner> = createDatafoncierOwnersRepository().stream()
) {
  logger.info('Importing owners...');
  return stream
    .flatMap((dfOwner) => highland(processOwner(dfOwner)))
    .filter((result) => !!result.match || !!result.owner)
    .batch(1_000)
    .flatMap(save)
    .errors((error) => {
      logger.error(error);
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

function save(results: Result[]): Stream<void> {
  async function saveResult(): Promise<void> {
    const owners = results.map((result) => result.owner).filter(isDefined);
    if (owners.length) {
      await OwnerRepository.saveMany(owners);
    }

    const matches = results.map((result) => result.match).filter(isDefined);
    if (matches.length) {
      await OwnerMatchRepository.saveMany(matches);
    }
  }

  return highland(saveResult());
}

export default ownerImporter;
