import config from '../utils/config';
import { OwnerProspect, OwnerProspectSortable } from '../models/OwnerProspect';
import { createHttpService } from '../utils/fetchUtils';
import authService from './auth.service';
import { PaginatedResult } from '../models/PaginatedResult';
import { PaginationOptions } from '../../../shared/models/Pagination';
import { SortOptions, toQuery } from '../models/Sort';

const http = createHttpService('owner-prospects', {
  host: config.apiEndpoint,
  json: true,
});

const create = async (ownerProspect: OwnerProspect): Promise<OwnerProspect> => {
  const response = await http.post('/api/owner-prospects', {
    body: JSON.stringify(ownerProspect),
  });
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

  const response = await http.get(`/api/owner-prospects?${query}`, {
    headers: {
      ...authService.authHeader(),
    },
    abortId: 'find-owner-prospects',
  });
  return response.json();
};

const update = async (ownerProspect: OwnerProspect): Promise<void> => {
  const { id, ...op } = ownerProspect;
  await http.put(`/api/owner-prospects/${id}`, {
    body: JSON.stringify(op),
    headers: {
      ...authService.authHeader(),
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
