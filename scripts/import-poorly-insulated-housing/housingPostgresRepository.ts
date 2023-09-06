import highland from 'highland';

import {
  HousingStreamRepository,
  StreamOptions,
} from '../../server/repositories/housingStreamRepository';
import { HousingApi } from '../../server/models/HousingApi';
import db from '../../server/repositories/db';
import {
  HousingDatafoncier,
  toHousingRecordApi,
} from '../../server/models/HousingDatafoncier';
import { isNotNull } from '../../shared/utils/compare';
import { datafoncierOwnersTable } from './ownerPostgresRepository';
import {
  ownerTable,
  parseOwnerApi,
} from '../../server/repositories/ownerRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import { logger } from '../../server/utils/logger';

const FIELDS = ['*'];
export const datafoncierHousingTable = 'zlv_logt_epci';

class HousingPostgresRepository implements HousingStreamRepository {
  stream(opts: StreamOptions): Highland.Stream<HousingApi> {
    logger.trace('Stream housing', opts);

    const query = db(datafoncierHousingTable)
      .select(FIELDS)
      .where({
        ccthp: 'L',
      })
      .whereIn('dteloctxt', ['APPARTEMENT', 'MAISON'])
      .stream();

    return highland<HousingDatafoncier>(query)
      .flatMap((housing) =>
        highland(
          findOwners(housing.idprocpte).then(
            (owners: OwnerApi[]): HousingApi | null => {
              // Avoid importing housing that have no owner
              if (!owners.length) {
                return null;
              }

              const housingApi = toHousingRecordApi(housing);
              const [owner, ...coowners] = owners.map((owner, i) => ({
                ...owner,
                housingId: housingApi.id,
                rank: i + 1,
                origin: 'Datafoncier',
              }));
              return {
                ...housingApi,
                owner,
                coowners,
                campaignIds: [],
                contactCount: 0,
              };
            }
          )
        )
      )
      .filter(isNotNull);
  }
}

async function findOwners(idprocpte: string): Promise<OwnerApi[]> {
  logger.trace('Find owners', { idprocpte });

  const owners = await db(ownerTable)
    .select(`${ownerTable}.*`)
    .join(
      'zlv_datafoncier_owners',
      'zlv_datafoncier_owners.zlv_id',
      `${ownerTable}.id`
    )
    .join(
      datafoncierOwnersTable,
      `${datafoncierOwnersTable}.idprodroit`,
      'zlv_datafoncier_owners.datafoncier_id'
    )
    .where(`${datafoncierOwnersTable}.idprocpte`, idprocpte)
    .orderBy(`${datafoncierOwnersTable}.dnulp`);

  logger.trace(`Found ${owners.length} owner(s).`);

  return owners.map(parseOwnerApi);
}

function createHousingPostgresRepository(): HousingStreamRepository {
  return new HousingPostgresRepository();
}

export default createHousingPostgresRepository;
