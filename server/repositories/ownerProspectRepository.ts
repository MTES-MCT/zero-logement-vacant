import db, { countQuery } from './db';
import {
  OwnerProspectApi,
  OwnerProspectSortableApi,
  OwnerProspectSortApi,
} from '../models/OwnerProspectApi';
import { establishmentsTable } from './establishmentRepository';
import { paginationQuery } from '../models/PaginationApi';
import SortApi from '../models/SortApi';
import { Paginated, Pagination } from '../../shared/models/Pagination';

export const ownerProspectsTable = 'owner_prospects';

export const OwnerProspects = () => db<OwnerProspectDbo>(ownerProspectsTable);

const insert = async (
  ownerProspectApi: OwnerProspectApi
): Promise<OwnerProspectApi> => {
  console.log('Insert ownerProspect with email', ownerProspectApi.email);

  return OwnerProspects()
    .insert(formatOwnerProspectApi(ownerProspectApi))
    .returning('*')
    .then((_) => parseOwnerProspectApi(_[0]));
};

interface FindOptions {
  establishmentId: string;
  pagination: Required<Pagination>;
  sort?: OwnerProspectSortApi;
}

const find = async (
  options: FindOptions
): Promise<Paginated<OwnerProspectApi>> => {
  const { establishmentId, pagination, sort } = options;

  const query = OwnerProspects()
    .joinRaw(
      `JOIN ${establishmentsTable} e ON geo_code = ANY(e.localities_geo_code) AND e.id = ?`,
      establishmentId
    )
    .modify(paginationQuery(pagination));

  const totalCount = await countQuery(query.clone());
  const ownerProspects: OwnerProspectDbo[] = await query
    .select(`${ownerProspectsTable}.*`)
    .modify((builder: ReturnType<typeof OwnerProspects>) => {
      if (sort) {
        SortApi.use<OwnerProspectSortableApi>(sort, {
          keys: {
            address: () => builder.orderBy('address', sort.address),
            email: () => builder.orderBy('email', sort.email),
            createdAt: () => builder.orderBy('created_at', sort.createdAt),
          },
        });
      } else {
        builder.orderBy('created_at', 'desc');
      }
    });

  return {
    entities: ownerProspects.map(parseOwnerProspectApi),
    filteredCount: ownerProspects.length,
    totalCount,
    page: options.pagination.paginate ? options.pagination.page : 1,
    perPage: options.pagination.paginate
      ? options.pagination.perPage
      : ownerProspects.length,
  };
};

interface FindOneOptions {
  id: string;
  establishmentId: string;
}

const findOne = async (
  options: FindOneOptions
): Promise<OwnerProspectApi | null> => {
  const { establishmentId, id } = options;

  const ownerProspect = await OwnerProspects()
    .select(`${ownerProspectsTable}.*`)
    .joinRaw(
      `JOIN ${establishmentsTable} e ON geo_code = ANY(e.localities_geo_code) AND e.id = ?`,
      establishmentId
    )
    .where(`${ownerProspectsTable}.id`, id)
    .first();
  return ownerProspect ? parseOwnerProspectApi(ownerProspect) : null;
};

const update = async (ownerProspect: OwnerProspectApi): Promise<void> => {
  await OwnerProspects().where({ id: ownerProspect.id }).update({
    call_back: ownerProspect.callBack,
    read: ownerProspect.read,
  });
};

interface OwnerProspectDbo {
  id: string;
  address: string;
  invariant?: string;
  geo_code: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notes?: string;
  call_back: boolean;
  read: boolean;
  created_at: string;
}

const parseOwnerProspectApi = (
  ownerProspectDbo: OwnerProspectDbo
): OwnerProspectApi => ({
  id: ownerProspectDbo.id,
  address: ownerProspectDbo.address,
  invariant: ownerProspectDbo.invariant,
  geoCode: ownerProspectDbo.geo_code,
  email: ownerProspectDbo.email,
  firstName: ownerProspectDbo.first_name,
  lastName: ownerProspectDbo.last_name,
  phone: ownerProspectDbo.phone,
  notes: ownerProspectDbo.notes,
  callBack: ownerProspectDbo.call_back,
  read: ownerProspectDbo.read,
  createdAt: new Date(ownerProspectDbo.created_at),
});

const formatOwnerProspectApi = (
  ownerProspectApi: OwnerProspectApi
): OwnerProspectDbo => ({
  id: ownerProspectApi.id,
  address: ownerProspectApi.address,
  invariant: ownerProspectApi.invariant,
  geo_code: ownerProspectApi.geoCode,
  email: ownerProspectApi.email,
  first_name: ownerProspectApi.firstName,
  last_name: ownerProspectApi.lastName,
  phone: ownerProspectApi.phone,
  notes: ownerProspectApi.notes,
  call_back: ownerProspectApi.callBack,
  read: ownerProspectApi.read,
  created_at: ownerProspectApi.createdAt.toISOString(),
});

export default {
  insert,
  find,
  findOne,
  update,
  parseOwnerProspectApi,
  formatOwnerProspectApi,
};
