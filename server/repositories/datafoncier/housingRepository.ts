import fetch from 'node-fetch';

import { logger } from '../../utils/logger';
import config from '../../utils/config';
import { DatafoncierHousing } from '../../../shared';

const API = config.datafoncier.api;

export interface FindOneOptions {
  localId: string;
}

const findOne = async (
  opts: FindOneOptions
): Promise<DatafoncierHousing | null> => {
  logger.debug('Find one housing', opts);

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

export default {
  findOne,
};
