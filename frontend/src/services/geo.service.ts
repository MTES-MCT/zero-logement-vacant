import { GeoPerimeter } from '../models/GeoPerimeter';
import { zlvApi } from './api.service';

export const geoPerimetersApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    listGeoPerimeters: builder.query<GeoPerimeter[], void>({
      query: () => 'geo/perimeters',
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
        url: `geo/perimeters/${geoPerimeterId}`,
        method: 'PUT',
        body: { kind, name },
      }),
      invalidatesTags: (result, error, { geoPerimeterId }) => [
        { type: 'GeoPerimeter', id: geoPerimeterId },
      ],
    }),
    deleteGeoPerimeters: builder.mutation<void, string[]>({
      query: (geoPerimeterIds) => ({
        url: 'geo/perimeters',
        method: 'DELETE',
        body: { geoPerimeterIds },
      }),
      invalidatesTags: (result, error, geoPerimeterId) => [
        { type: 'GeoPerimeter', geoPerimeterId },
      ],
    }),
    uploadGeoPerimeterFile: builder.mutation<void, File>({
      query: (file) => ({
        url: 'geo/perimeters',
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
