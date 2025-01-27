import { Knex } from 'knex';

import db from '~/infra/database';
import { PrecisionApi } from '~/models/PrecisionApi';

export const PRECISION_TABLE = 'precisions';
export const Precisions = (transaction: Knex<PrecisionDBO> = db) =>
  transaction(PRECISION_TABLE);

export type PrecisionDBO = PrecisionApi;
