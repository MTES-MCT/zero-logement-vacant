import { createQuery, DatafoncierOwner } from '@zerologementvacant/shared';
import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { DatafoncierResultDTO } from '~/models/DatafoncierResultDTO';

const API = config.datafoncier.api;

export interface FindOptions {
  filters: {
    geoCode: string;
    idprocpte?: string;
  };
}

const find = async (opts: FindOptions): Promise<DatafoncierOwner[]> => {
  logger.debug('Find datafoncier owners', opts);

  const query = createQuery({
    fields: 'all',
    code_insee: opts.filters.geoCode,
    idprocpte: opts.filters?.idprocpte,
    ordering: opts.filters?.idprocpte ? 'dnulp' : undefined,
  });
  logger.debug('Fetch datafoncier owners', query);

  const response = await fetch(`${API}/ff/proprios${query}`, {
    headers: {
      Authorization: `Token ${config.datafoncier.token}`,
    },
  });
  if (!response.ok) {
    logger.error('Cannot fetch datafoncier owners', response.statusText);
    return [];
  }

  const data =
    (await response.json()) as DatafoncierResultDTO<DatafoncierOwner>;
  logger.debug(`Found ${data.results.length} datafoncier owners.`);
  return data.results;
};

export default {
  find,
};
