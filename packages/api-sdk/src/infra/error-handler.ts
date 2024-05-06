import { AxiosResponse, isAxiosError } from 'axios';
import { constants } from 'node:http2';

export default function createErrorHandler() {
  return (error: Error): AxiosResponse => {
    if (isAxiosError(error)) {
      if (error.response?.status === constants.HTTP_STATUS_NOT_FOUND) {
        return {
          ...error.response,
          data: null,
          statusText: 'NOT_FOUND',
        };
      }
    }

    throw error;
  };
}
