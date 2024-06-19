import { Request, Response } from 'express';
import { constants } from 'http2';

import { FileUploadDTO } from '@zerologementvacant/models';
import FileUploadError from '~/errors/fileUploadError';
import config from '~/infra/config';
import { createS3, getBase64Content } from '@zerologementvacant/utils';

async function create(request: Request, response: Response<FileUploadDTO>): Promise<void> {
  const file = request.file as Express.MulterS3.File;

  if (!file) {
    throw new FileUploadError();
  }

  // Download logos from S3
  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });

  const upload: FileUploadDTO = {
    id: file.key,
    type: file.contentType,
    url: file.key,
    content: await getBase64Content(file.key, { s3, bucket: config.s3.bucket }),
  };
  response.status(constants.HTTP_STATUS_CREATED).json(upload);
}

export default {
  create,
};
