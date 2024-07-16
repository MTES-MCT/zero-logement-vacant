import { AxiosResponse, isAxiosError } from 'axios';
import { constants } from 'node:http2';

import { Logger } from '@zerologementvacant/utils';

interface Options {
  logger: Logger;
}

export default function createErrorHandler(opts: Options) {
  const { logger } = opts;

  return (error: Error): AxiosResponse => {
    if (isAxiosError(error)) {
      if (error.response?.status === constants.HTTP_STATUS_NOT_FOUND) {
        return {
          ...error.response,
          data: null,
          statusText: 'NOT_FOUND'
        };
      }
    }

    logger.error('Unhandled error in API SDK', error);
    throw error;
  };
}
