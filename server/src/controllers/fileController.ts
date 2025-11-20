import { Request, Response } from 'express';
import { constants } from 'http2';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';

import { FileUploadDTO } from '@zerologementvacant/models';
import FileUploadError from '~/errors/fileUploadError';
import config from '~/infra/config';
import { createS3, getBase64Content } from '@zerologementvacant/utils/node';
import { logger } from '~/infra/logger';

/**
 * Upload file to S3 and return file information
 *
 * This controller expects the file to be validated by:
 * 1. upload() middleware - basic checks and memory storage
 * 2. fileTypeMiddleware - magic bytes validation
 * 3. antivirusMiddleware - virus scanning
 */
async function create(request: Request, response: Response<FileUploadDTO>): Promise<void> {
  const file = request.file;

  if (!file) {
    throw new FileUploadError();
  }

  // Generate unique key for S3
  const fileKey = uuidv4();

  logger.info('Uploading validated file to S3', {
    originalName: file.originalname,
    fileKey,
    size: file.size,
    mimeType: file.mimetype
  });

  // Create S3 client
  const s3 = createS3({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  });

  try {
    // Upload file buffer to S3
    await s3.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'authenticated-read',
      Metadata: {
        originalName: file.originalname,
        fieldName: file.fieldname
      }
    }));

    logger.info('File uploaded to S3 successfully', {
      fileKey,
      originalName: file.originalname,
      size: file.size
    });

    // Get base64 content for response
    const content = await getBase64Content(fileKey, { s3, bucket: config.s3.bucket });

    const upload: FileUploadDTO = {
      id: fileKey,
      type: file.mimetype,
      url: fileKey,
      content
    };

    response.status(constants.HTTP_STATUS_CREATED).json(upload);
  } catch (error) {
    logger.error('Failed to upload file to S3', {
      fileKey,
      originalName: file.originalname,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new FileUploadError();
  }
}

export default {
  create,
};
