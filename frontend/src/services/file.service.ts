import { zlvApi } from './api.service';

export const fileApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation<void, File>({
      query: (file) => {
        const data = new FormData();
        data.set('file', file);

        return {
          url: '/files',
          method: 'POST',
          body: data,
        };
      },
    }),
  }),
});

export const { useUploadFileMutation } = fileApi;
