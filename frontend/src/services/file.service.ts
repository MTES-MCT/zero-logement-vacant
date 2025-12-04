import { zlvApi } from './api.service';
import type { FileUploadDTO } from '@zerologementvacant/models';
import { getFileUploadErrorMessage } from '../utils/fileUploadErrors';

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
      transformErrorResponse: (error) => {
        return getFileUploadErrorMessage(error, false);
      },
    }),
  }),
});

export const { useUploadFileMutation } = fileApi;
