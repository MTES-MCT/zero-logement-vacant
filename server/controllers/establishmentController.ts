import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';
import { constants } from 'http2';
import { query, ValidationChain } from 'express-validator';
import { EstablishmentKind } from '../../shared/types/EstablishmentKind';
import validator from 'validator';

const listValidators: ValidationChain[] = [
  query('available').optional({ nullable: true }).isBoolean(),
  query('query').optional({ nullable: true }).isString(),
  query('kind').optional({ nullable: true }).isString(),
  query('geoCodes')
    .optional({ nullable: true })
    .isArray()
    .custom((value) =>
      value.every(
        (v: any) =>
          validator.isAlphanumeric(v) &&
          validator.isLength(v, { min: 5, max: 5 })
      )
    ),
];

const list = async (
  request: Request,
  response: Response
): Promise<Response> => {
  console.log('list establishments');

  const available = request.query.available
    ? Boolean(request.query.available)
    : undefined;
  const searchQuery = <string>request.query.query;
  const geoCodes = <string[]>request.query.geoCodes;
  const kind = <EstablishmentKind>request.query.kind;

  if (available === undefined && !searchQuery?.length && !geoCodes?.length) {
    return response.sendStatus(constants.HTTP_STATUS_BAD_REQUEST);
  }

  return establishmentRepository
    .listWithFilters({ available, query: searchQuery, geoCodes, kind })
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

export default {
  listValidators,
  list,
};
