import { boolean, number, object } from 'yup';

export const MAX_PER_PAGE = 500;

export const pagination = object({
  paginate: boolean().default(true),
  page: number().integer().min(1).default(1),
  perPage: number().integer().min(1).max(MAX_PER_PAGE).default(50)
});
