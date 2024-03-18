import { Request, Response } from 'express';
import { query, ValidationChain } from 'express-validator';
import { constants } from 'http2';

import establishmentRepository from '../repositories/establishmentRepository';
import { EstablishmentKind } from '../../shared/types/EstablishmentKind';
import { logger } from '../utils/logger';
import {
  every,
  hasKeys,
  isCommaDelimitedString,
  isGeoCode,
  split,
} from '../utils/validators';

const listValidators: ValidationChain[] = [
  query('available').optional({ nullable: true }).isBoolean().toBoolean(true),
  query('query').optional({ nullable: true }).isString(),
  query('kind').optional({ nullable: true }).isString(),
  query('name').optional({ nullable: true }).isString(),
  query('geoCodes')
    .optional({ nullable: true })
    .isString()
    .custom(isCommaDelimitedString)
    .bail()
    .customSanitizer(split(','))
    .custom(every(isGeoCode)),
  query().isObject({ strict: true }).custom(hasKeys),
];

async function list(request: Request, response: Response) {
  logger.info('List establishments');

  const available = request.query.available as unknown as boolean;
  const searchQuery = request.query.query as string;
  const name = request.query.name as string;
  const geoCodes = request.query.geoCodes as string[];
  const kind = request.query.kind as EstablishmentKind;

  const establishments = await establishmentRepository.find({
    available,
    query: searchQuery,
    geoCodes,
    kind,
    name,
  });
  response.status(constants.HTTP_STATUS_OK).json(establishments);
}

export default {
  listValidators,
  list,
};
