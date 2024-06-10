import { HeadBucketCommand } from '@aws-sdk/client-s3';

import { createS3, S3Options } from '@zerologementvacant/utils';
import { Check } from './check';

interface Options extends S3Options {
  bucket: string;
}

export function s3Check(opts: Options): Check {
  const { bucket, ...rest } = opts;
  return {
    name: 's3',
    async test() {
      const client = createS3(rest);
      const command = new HeadBucketCommand({
        Bucket: bucket,
      });
      await client.send(command);
      client.destroy();
    },
  };
}
