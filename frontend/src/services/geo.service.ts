import type { GeoPerimeter } from '../models/GeoPerimeter';
import { zlvApi } from './api.service';
import { getFileUploadErrorMessage } from '../utils/fileUploadErrors';

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
      invalidatesTags: (_result, _error, { geoPerimeterId }) => [
        { type: 'GeoPerimeter', id: geoPerimeterId },
      ],
    }),
    deleteGeoPerimeters: builder.mutation<void, string[]>({
      query: (geoPerimeterIds) => ({
        url: 'geo/perimeters',
        method: 'DELETE',
        body: { geoPerimeterIds },
      }),
      invalidatesTags: (_result, _error, geoPerimeterId) => [
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
      transformErrorResponse: (error) => {
        return getFileUploadErrorMessage(error, true);
      },
    }),
  }),
});

const fileToFormData = (file: File) => {
  const formData: FormData = new FormData();
  // Field name must match server expectation (uploadGeo middleware expects 'file')
  formData.append('file', file, file.name);
  return formData;
};

export const {
  useListGeoPerimetersQuery,
  useUpdateGeoPerimeterMutation,
  useDeleteGeoPerimetersMutation,
  useUploadGeoPerimeterFileMutation,
} = geoPerimetersApi;
