import fetch from '@adobe/node-fetch-retry';
import async from 'async';
import highland from 'highland';
import fp from 'lodash/fp';
import { URLSearchParams } from 'url';

import { OwnerApi } from '../models/OwnerApi';
import { logger } from '../utils/logger';
import { isPaginationEnabled, PaginationApi } from '../models/PaginationApi';
import config from '../utils/config';
import { untilEmpty } from '../utils/async';
import { HousingDatafoncier } from '../models/HousingDatafoncier';
import { OwnerDatafoncier, toOwnerApi } from '../models/OwnerDatafoncier';
import Stream = Highland.Stream;

const API = `https://apidf-preprod.cerema.fr`;

type FindHousingListOptions = PaginationApi & {
  geoCode: string;
};

async function findHousingList(
  opts: FindHousingListOptions
): Promise<HousingDatafoncier[]> {
  logger.debug('Finding housing list', opts);

  const query = createQuery({
    fields: 'all',
    dteloc: '1,2',
    code_insee: opts.geoCode,
    page: isPaginationEnabled(opts) ? opts.page.toString() : null,
    page_size: isPaginationEnabled(opts) ? opts.perPage.toString() : null,
  });
  const response = await fetch(`${API}/ff/locaux?${query}`, {
    headers: {
      Authorization: `Token ${config.datafoncier.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data: ResultDTO<HousingDatafoncier> = await response.json();
  return data.results;
}

interface StreamOptions {
  geoCodes: string[];
}

function streamHousingList(opts: StreamOptions): Stream<HousingDatafoncier> {
  logger.debug('Stream housing list', opts);

  return highland<string>(opts.geoCodes)
    .flatMap((geoCode) =>
      highland<HousingDatafoncier[]>((push, next) => {
        untilEmpty(
          (pagination) => findHousingList({ geoCode, ...pagination }),
          (housingList) => push(null, housingList)
        )
          .then(() => {
            push(null, highland.nil);
          })
          .catch(push);
      })
    )
    .flatten()
    .filter(occupancy('L'));
}

interface FindOwnersOptions {
  geoCode: string;
  /**
   * Pass the communal account id to list house's owners.
   * @see http://doc-datafoncier.cerema.fr/ff/doc_fftp/table/pb0010_local/last/idprocpte
   */
  forHousing?: string;
}

async function findOwners(opts: FindOwnersOptions): Promise<OwnerApi[]> {
  const query = createQuery({
    fields: 'all',
    code_insee: opts.geoCode,
    idprocpte: opts.forHousing,
    // Order by owner rank
    ordering: opts.forHousing ? 'dnulp' : undefined,
  });
  const response = await fetch(`${API}/ff/proprios?${query}`, {
    headers: {
      Authorization: `Token ${config.datafoncier.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const data: ResultDTO<OwnerDatafoncier> = await response.json();
  return data.results.map(toOwnerApi);
}

function streamOwners(opts: StreamOptions): Stream<OwnerApi> {
  logger.debug('Stream owners', {
    options: opts,
  });

  return highland<OwnerApi[]>((push, next) => {
    async
      .forEachSeries(opts.geoCodes, async (geoCode) => {
        await untilEmpty(
          () => findOwners({ geoCode }),
          (owners) => {
            push(null, owners);
            next();
          }
        );
      })
      .catch((error) => {
        push(error);
        next();
      });
  }).flatten();
}

function createQuery(
  params: Record<string, string | null | undefined>
): URLSearchParams {
  return fp.pipe(
    // Faster than fp.omitBy
    fp.pickBy((value) => !fp.isNil(value)),
    (params: Record<string, string>) => new URLSearchParams(params)
  )(params);
}

function filterHousing<T extends HousingDatafoncier, K extends keyof T>(
  key: K
) {
  return (...values: T[K][]) => {
    const set = new Set(values);

    return (housing: T): boolean => set.has(housing[key]);
  };
}

const occupancy = filterHousing('ccthp');

interface ResultDTO<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export default {
  housing: {
    find: findHousingList,
    stream: streamHousingList,
  },
  owners: {
    find: findOwners,
    stream: streamOwners,
  },
};
