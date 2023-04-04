import config from '../utils/config';
import authService from './auth.service';
import { GeoPerimeter } from '../models/GeoPerimeter';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

export const geoPerimetersApi = createApi({
  reducerPath: 'geoPerimetersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/geo/perimeters`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['GeoPerimeter'],
  endpoints: (builder) => ({
    listGeoPerimeters: builder.query<GeoPerimeter[], void>({
      query: () => '',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'GeoPerimeter' as const,
                id,
              })),
              'GeoPerimeter',
            ]
          : ['GeoPerimeter'],
    }),
    updateGeoPerimeter: builder.mutation<
      void,
      { geoPerimeterId: string; kind: string; name?: string }
    >({
      query: ({ geoPerimeterId, kind, name }) => ({
        url: geoPerimeterId,
        method: 'PUT',
        body: { kind, name },
      }),
      invalidatesTags: (result, error, { geoPerimeterId }) => [
        { type: 'GeoPerimeter', id: geoPerimeterId },
      ],
    }),
    deleteGeoPerimeters: builder.mutation<void, string[]>({
      query: (geoPerimeterIds) => ({
        url: '',
        method: 'DELETE',
        body: { geoPerimeterIds },
      }),
      invalidatesTags: (result, error, geoPerimeterId) => [
        { type: 'GeoPerimeter', geoPerimeterId },
      ],
    }),
    uploadGeoPerimeterFile: builder.mutation<void, File>({
      query: (file) => ({
        url: '',
        method: 'POST',
        body: fileToFormData(file),
      }),
      invalidatesTags: ['GeoPerimeter'],
    }),
  }),
});

const fileToFormData = (file: File) => {
  const formData: FormData = new FormData();
  formData.append('geoPerimeter', file, file.name);
  return formData;
};

export const {
  useListGeoPerimetersQuery,
  useUpdateGeoPerimeterMutation,
  useDeleteGeoPerimetersMutation,
  useUploadGeoPerimeterFileMutation,
} = geoPerimetersApi;
