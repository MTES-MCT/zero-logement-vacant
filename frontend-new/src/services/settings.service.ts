import { SettingsDTO } from '../../../shared';
import { DeepPartial } from 'ts-essentials';
import { zlvApi } from './api.service';

interface FindOneOptions {
  establishmentId: string;
}

const DEFAULT_SETTINGS: SettingsDTO = {
  contactPoints: {
    public: false,
  },
  inbox: {
    enabled: true,
  },
};

export const settingsApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findSettings: builder.query<SettingsDTO, FindOneOptions>({
      query: (options) => `establishments/${options.establishmentId}/settings`,
      providesTags: () => ['Settings'],
      transformErrorResponse: (response) => {
        if (response.status === 404) {
          return DEFAULT_SETTINGS;
        }
      },
    }),
    upsertSettings: builder.mutation<
      void,
      {
        establishmentId: string;
        settings: DeepPartial<SettingsDTO>;
      }
    >({
      query: ({ establishmentId, settings }) => ({
        url: `establishments/${establishmentId}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const { useFindSettingsQuery, useUpsertSettingsMutation } = settingsApi;
