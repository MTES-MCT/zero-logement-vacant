import { zlvApi } from './api.service';
import { FileUploadDTO } from '../../../shared/models/FileUploadDTO';

export const fileApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation<FileUploadDTO, File>({
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
