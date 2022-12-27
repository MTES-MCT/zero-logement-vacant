import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';
import { constants } from 'http2';
import { query, ValidationChain } from 'express-validator';

const listAvailableEstablishments = async (
  request: Request,
  response: Response
): Promise<Response> => {
  console.log('list available establishments');

  return establishmentRepository
    .listAvailable()
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

const searchQueryValidator: ValidationChain[] = [
  query('q').notEmpty().isString(),
];

const searchEstablishments = async (
  request: Request,
  response: Response
): Promise<Response> => {
  const searchQuery = <string>request.query.q;

  console.log('Search establishments', searchQuery);

  return establishmentRepository
    .search(searchQuery)
    .then((_) => response.status(constants.HTTP_STATUS_OK).json(_));
};

export default {
  listAvailableEstablishments,
  searchQueryValidator,
  searchEstablishments,
};
