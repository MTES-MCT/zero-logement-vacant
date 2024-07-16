import { FileUploadDTO } from '@zerologementvacant/models';
import { createS3, getContent, toBase64 } from '@zerologementvacant/utils';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';

const logger = createLogger('fileRepository');
const s3 = createS3({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey
});

export async function download(logo: string): Promise<FileUploadDTO> {
  logger.debug('Downloading logo from S3...');
  const { content, response } = await getContent(logo, {
    s3,
    bucket: config.s3.bucket
  });

  return {
    id: logo,
    content: toBase64(content, response.ContentType),
    url: logo,
    type: response.ContentType ?? 'base64'
  };
}
