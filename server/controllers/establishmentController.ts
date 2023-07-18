import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';
import { constants } from 'http2';
import { query, ValidationChain } from 'express-validator';
import { EstablishmentKind } from '../../shared/types/EstablishmentKind';
import validator from 'validator';
import BadRequestError from '../errors/badRequestError';

const listValidators: ValidationChain[] = [
  query('available').optional({ nullable: true }).isBoolean(),
  query('query').optional({ nullable: true }).isString(),
  query('kind').optional({ nullable: true }).isString(),
  query('name').optional({ nullable: true }).isString(),
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

const list = async (request: Request, response: Response) => {
  console.log('list establishments');

  const available = request.query.available
    ? Boolean(request.query.available)
    : undefined;
  const searchQuery = request.query.query as string;
  const name = request.query.name as string;
  const geoCodes = request.query.geoCodes as string[];
  const kind = request.query.kind as EstablishmentKind;

  if (
    available === undefined &&
    !searchQuery?.length &&
    !geoCodes?.length &&
    !name?.length
  ) {
    throw new BadRequestError();
  }

  const establishments = await establishmentRepository.find({
    available,
    query: searchQuery,
    geoCodes,
    kind,
    name,
  });
  response.status(constants.HTTP_STATUS_OK).json(establishments);
};

export default {
  listValidators,
  list,
};
