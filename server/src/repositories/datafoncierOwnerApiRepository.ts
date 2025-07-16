import { DatafoncierOwner } from '@zerologementvacant/models';
import axios from 'axios';
import config from '~/infra/config';
import { logger } from '~/infra/logger';

const API = config.datafoncier.api;

export interface FindOptions {
  filters: {
    geoCode: string;
    idprocpte?: string;
  };
}

const find = async (opts: FindOptions): Promise<DatafoncierOwner[]> => {
  logger.debug('Find datafoncier owners', opts);

  const query = {
    fields: 'all',
    code_insee: opts.filters.geoCode,
    idprocpte: opts.filters?.idprocpte,
    ordering: opts.filters?.idprocpte ? 'dnulp' : undefined
  };
  logger.debug('Fetch datafoncier owners', query);

  try {
    const response = await axios.get(`${API}/ff/proprios${query}`, {
      params: query,
      headers: {
        Authorization: `Token ${config.datafoncier.token}`
      }
    });

    logger.debug(`Found ${response.data.results.length} datafoncier owners.`);
    return response.data.results;
  } catch (error) {
    logger.error('Error fetching datafoncier owners', error);
    return [];
  }
};

export default {
  find
};
