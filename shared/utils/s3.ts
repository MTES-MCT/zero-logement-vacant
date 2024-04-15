import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface S3Options {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function createS3(opts: S3Options): S3Client {
  return new S3Client({
    endpoint: opts.endpoint,
    region: opts.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
  });
}

interface ToBase64Options {
  s3: S3Client;
  bucket: string;
}

export async function toBase64(
  logo: string,
  opts: ToBase64Options
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: opts.bucket,
    Key: logo,
  });
  const response = await opts.s3.send(command);
  if (!response.Body) {
    throw new Error(`File ${logo} not found`);
  }
  const content = await response.Body?.transformToString('base64');
  return `data:${response.ContentType};charset=utf-8;base64, ${content}`;
}
