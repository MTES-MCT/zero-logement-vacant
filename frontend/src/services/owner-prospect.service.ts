import config from '../utils/config';
import { OwnerProspect, OwnerProspectSortable } from '../models/OwnerProspect';
import { createHttpService } from '../utils/fetchUtils';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { SortOptions, toQuery } from '../models/Sort';

const http = createHttpService('owner-prospects');

const create = async (ownerProspect: OwnerProspect): Promise<OwnerProspect> => {
  const response = await http.fetch(
    `${config.apiEndpoint}/api/owner-prospects`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ownerProspect),
    }
  );
  if (!response.ok) {
    throw new Error('Une erreur s’est produite.');
  }
  return response.json();
};

export type FindOptions = PaginationOptions &
  SortOptions<OwnerProspectSortable>;

const find = async (
  options?: Partial<FindOptions>
): Promise<PaginatedResult<OwnerProspect>> => {
  const query = new URLSearchParams();
  const sort = toQuery(options?.sort);
  if (sort.length > 0) {
    query.set('sort', sort);
  }

  const response = await http.fetch(
    `${config.apiEndpoint}/api/owner-prospects?${query}`,
    {
      method: 'GET',
      headers: {
        ...authService.authHeader(),
      },
      abortId: 'find-owner-prospects',
    }
  );
  return response.json();
};

const update = async (ownerProspect: OwnerProspect): Promise<void> => {
  const { id, ...op } = ownerProspect;
  await http.fetch(`${config.apiEndpoint}/api/owner-prospects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(op),
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    abortId: 'update-owner-prospect',
  });
};

const ownerProspectService = {
  create,
  find,
  update,
};

export default ownerProspectService;
