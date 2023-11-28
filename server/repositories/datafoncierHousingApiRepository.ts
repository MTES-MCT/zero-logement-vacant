import fetch from 'node-fetch';

import { logger } from '../utils/logger';
import config from '../utils/config';
import { createQuery, DatafoncierHousing } from '../../shared';

const API = config.datafoncier.api;

interface HousingFilters {
  geoCode: string;
  idpar?: string;
}

interface FindOptions {
  filters: HousingFilters;
}

const find = async (opts: FindOptions): Promise<DatafoncierHousing[]> => {
  logger.debug('Find datafoncier housing', opts);

  const query = createQuery({
    fields: 'all',
    dteloc: '1,2',
    code_insee: opts.filters.geoCode,
  });
  const response = await fetch(`${API}/ff/locaux${query}`, {
    headers: {
      Authorization: `Token ${config.datafoncier.token}`,
    },
  });
  if (!response.ok) {
    logger.error('Cannot fetch datafoncier housing', response.statusText);
    return [];
  }

  const data: ResultDTO<DatafoncierHousing> = await response.json();
  return data.results.filter(isAllowed);
};

interface FindOneOptions {
  localId: string;
}

const findOne = async (
  opts: FindOneOptions
): Promise<DatafoncierHousing | null> => {
  logger.debug('Find one datafoncier housing', opts);

  const response = await fetch(`${API}/ff/locaux/${opts.localId}`, {
    headers: {
      Authorization: `Token ${config.datafoncier.token}`,
    },
  });

  if (!response.ok) {
    logger.error('Cannot fetch datafoncier housing', response.statusText);
    return null;
  }
  const housing: DatafoncierHousing = await response.json();
  return isAllowed(housing) ? housing : null;
};

function isAllowed(housing: DatafoncierHousing): boolean {
  const ALLOWED_DTELOCS = ['1', '2'];
  // TODO: ccogrm introuvable dans datafoncier ?
  return ALLOWED_DTELOCS.includes(housing.dteloc);
}

interface ResultDTO<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export default {
  find,
  findOne,
};
