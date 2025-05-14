import { BuildingDTO } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const buildingAPI = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getBuilding: builder.query<BuildingDTO, BuildingDTO['id']>({
      query: (id: string) => `/buildings/${id}`,
      providesTags: (building) =>
        building
          ? [
              {
                type: 'Building' as const,
                id: building.id
              }
            ]
          : []
    })
  })
});

export const { useGetBuildingQuery } = buildingAPI;
