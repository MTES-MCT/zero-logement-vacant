import { DraftOwner, HousingOwner, Owner } from '../models/Owner';
import { format, parseISO } from 'date-fns';
import { toTitleCase } from '../utils/stringUtils';
import { PaginatedResult } from '../models/PaginatedResult';
import { zlvApi } from './api.service';

export const ownerApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getOwner: builder.query<Owner, string>({
      query: (ownerId) => `owners/${ownerId}`,
      transformResponse: (o) => parseOwner(o),
      providesTags: (result) =>
        result
          ? [
              {
                type: 'Owner' as const,
                id: result.id,
              },
            ]
          : [],
    }),
    findOwners: builder.query<
      PaginatedResult<Owner>,
      { q: string; page: number; perPage: number }
    >({
      query: ({ q, page, perPage }) => ({
        url: 'owners',
        method: 'POST',
        body: { q, page, perPage },
      }),
      providesTags: () => ['Owner'],
      transformResponse: (response: any) => {
        return {
          ...response,
          entities: response.entities.map((e: any) => parseOwner(e)),
        };
      },
    }),
    findOwnersByHousing: builder.query<HousingOwner[], string>({
      query: (housingId) => `owners/housing/${housingId}`,
      providesTags: () => ['HousingOwner'],
      transformResponse: (response: any[]) =>
        response.map((_) => parseHousingOwner(_)),
    }),
    createOwner: builder.mutation<Owner, DraftOwner>({
      query: (draftOwner) => ({
        url: 'owners/creation',
        method: 'POST',
        body: formatOwner(draftOwner),
      }),
      transformResponse: (result: any) => parseOwner(result),
    }),
    updateOwner: builder.mutation<void, Owner>({
      query: (owner) => ({
        url: `owners/${owner.id}`,
        method: 'PUT',
        body: formatOwner(owner),
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Owner', id },
        'Housing',
      ],
    }),
    updateHousingOwners: builder.mutation<
      void,
      { housingId: string; housingOwners: HousingOwner[] }
    >({
      query: ({ housingId, housingOwners }) => ({
        url: `owners/housing/${housingId}`,
        method: 'PUT',
        body: housingOwners.map((ho) => formatOwner(ho)),
      }),
      invalidatesTags: (result, error, { housingId }) => [
        { type: 'HousingOwner', housingId },
      ],
    }),
  }),
});

export const parseOwner = (o: any): Owner => ({
  ...o,
  rawAddress: o.rawAddress
    ? o.rawAddress.filter((_: string) => _).map((_: string) => toTitleCase(_))
    : '',
  birthDate: o.birthDate ? parseISO(o.birthDate) : undefined,
  fullName: toTitleCase(o.fullName.replace(/^(MME |M )/i, '')),
  administrator: o.administrator ? toTitleCase(o.administrator) : undefined,
});

export const parseHousingOwner = (o: any): HousingOwner => ({
  ...o,
  ...parseOwner(o),
  startDate: o.startDate ? parseISO(o.startDate) : undefined,
  endDate: o.endDate ? parseISO(o.endDate) : undefined,
});

export const formatOwner = (owner: DraftOwner | Owner | HousingOwner) => ({
  ...owner,
  birthDate: owner.birthDate
    ? format(owner.birthDate, 'yyyy-MM-dd')
    : undefined,
});

export const {
  useGetOwnerQuery,
  useFindOwnersQuery,
  useFindOwnersByHousingQuery,
  useCreateOwnerMutation,
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation,
} = ownerApi;
