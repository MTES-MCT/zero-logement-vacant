import { DatafoncierHousing } from '@zerologementvacant/models';
import axios from 'axios';
import config from '~/infra/config';
import { logger } from '~/infra/logger';

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

  try {
    const query = {
      fields: 'all',
      dteloc: '1,2',
      code_insee: opts.filters.geoCode
    };
    const response = await axios.get(`${API}/ff/locaux`, {
      params: query,
      headers: {
        Authorization: `Token ${config.datafoncier.token}`
      }
    });
    return response.data.results.filter(isAllowed);
  } catch (error) {
    logger.error('Error fetching datafoncier housing', error);
    return [];
  }
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
      Authorization: `Token ${config.datafoncier.token}`
    }
  });

  if (!response.ok) {
    logger.error('Cannot fetch datafoncier housing', response.statusText);
    return null;
  }
  const housing = (await response.json()) as DatafoncierHousing;
  return isAllowed(housing) ? housing : null;
};

function isAllowed(housing: DatafoncierHousing): boolean {
  const ALLOWED_DTELOCS = ['1', '2'];
  // TODO: ccogrm introuvable dans datafoncier ?
  return ALLOWED_DTELOCS.includes(housing.dteloc);
}

export default {
  find,
  findOne
};
