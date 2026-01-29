import { Either, Array } from 'effect';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import async from 'async';
import { v4 as uuidv4 } from 'uuid';

import { FileValidationError } from '~/errors/fileValidationError';
import { createLogger } from '~/infra/logger';
import { DocumentApi } from '~/models/DocumentApi';
import { validateFiles, ValidateFilesOptions } from './file-validation';

const logger = createLogger('document-upload');

export interface UploadDocumentsOptions extends ValidateFilesOptions {
  /**
   * S3 client instance
   */
  s3: S3Client;

  /**
   * S3 bucket name
   */
  bucket: string;

  /**
   * Establishment ID for the documents
   */
  establishmentId: string;

  /**
   * User ID who is uploading
   */
  userId: string;

  /**
   * Function to generate S3 key for each file
   * @param file - The file being uploaded
   * @param index - Index in the files array
   * @returns S3 key path
   */
  generateS3Key: (file: Express.Multer.File, index: number) => string;

  /**
   * User object (for creator field)
   */
  user: any; // UserApi type
}

export interface UploadedDocument {
  document: DocumentApi;
  s3Key: string;
}

/**
 * Upload multiple documents to S3 with validation
 * Returns Either array - Left for errors, Right for successful uploads
 *
 * Process:
 * 1. Validate files (type + virus scan)
 * 2. Upload valid files to S3
 * 3. Return DocumentApi objects for successful uploads
 */
export async function uploadDocuments(
  files: Express.Multer.File[],
  options: UploadDocumentsOptions
): Promise<ReadonlyArray<Either.Either<DocumentApi, FileValidationError>>> {
  logger.info('Starting document upload process', {
    count: files.length,
    bucket: options.bucket,
    establishmentId: options.establishmentId
  });

  // Step 1: Validate files (type + virus scan)
  const validationResults = await validateFiles(files, {
    accept: options.accept
  });

  // Step 2: Upload valid files to S3 and create DocumentApi objects
  const uploadResults = await async.map(
    validationResults,
    async (
      either,
      index
    ): Promise<Either.Either<DocumentApi, FileValidationError>> => {
      // Already an error from validation
      if (Either.isLeft(either)) {
        return Either.left(either.left);
      }

      const file = either.right;
      const documentId = uuidv4();
      const s3Key = options.generateS3Key(file, index);

      try {
        const command = new PutObjectCommand({
          Bucket: options.bucket,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'authenticated-read',
          Metadata: {
            originalName: file.originalname,
            fieldName: file.fieldname,
            establishmentId: options.establishmentId,
            uploadedBy: options.userId
          }
        });

        await options.s3.send(command);

        logger.debug('File uploaded to S3', {
          filename: file.originalname,
          s3Key,
          documentId
        });

        const document: DocumentApi = {
          id: documentId,
          filename: file.originalname,
          s3Key,
          contentType: file.mimetype,
          sizeBytes: file.size,
          establishmentId: options.establishmentId,
          createdBy: options.userId,
          createdAt: new Date().toJSON(),
          updatedAt: null,
          deletedAt: null,
          creator: options.user
        };

        return Either.right(document);
      } catch (error) {
        logger.error('Failed to upload file to S3', {
          filename: file.originalname,
          s3Key,
          error: error instanceof Error ? error.message : String(error)
        });

        return Either.left(
          new FileValidationError(
            file.originalname,
            'invalid_file_type', // TODO: Use 'upload_failed' when added to enum
            'Failed to upload file to storage',
            {
              s3Key,
              error: error instanceof Error ? error.message : String(error)
            }
          )
        );
      }
    }
  );

  const [errors, validUploads] = Array.partition(uploadResults, Either.isLeft);

  logger.info('Document upload process completed', {
    total: files.length,
    succeeded: validUploads.length,
    failed: errors.length
  });

  return uploadResults;
}
