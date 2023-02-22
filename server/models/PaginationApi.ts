import { body, ValidationChain } from 'express-validator';

export interface PaginationApi {
  paginate?: boolean;
  page?: number;
  perPage?: number;
}

export const MAX_PER_PAGE = 500;

export const validators: ValidationChain[] = [
  body('paginate').default(true).isBoolean(),
  body('page').default(1).isInt({ min: 1 }),
  body('perPage').default(25).isInt({ min: 1, max: MAX_PER_PAGE }),
];

export default {
  validators,
};
