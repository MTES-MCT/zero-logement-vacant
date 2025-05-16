import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createS3 } from '@zerologementvacant/utils/node';
import async from 'async';
import { parse as parseJSONL } from 'jsonlines';
import { Transform } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { ReadableStreamReadResult } from 'stream/web';

import { SourceRepository } from '~/scripts/import-lovac/infra/source-repository';

export interface S3RepositoryConfig {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export abstract class SourceS3Repository<A> implements SourceRepository<A> {
  protected s3: S3Client;

  protected constructor(
    protected file: string,
    protected config: S3RepositoryConfig
  ) {
    this.s3 = createS3({
      endpoint: config.endpoint,
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });
  }

  stream(): ReadableStream<A> {
    const { config, file, s3 } = this;

    let jsonStream: ReadableStream<any> | null;

    return new ReadableStream({
      async start(controller) {
        const command = new GetObjectCommand({
          Bucket: config.bucket,
          Key: file
        });
        const response = await s3.send(command);
        if (!response.Body) {
          throw new Error(`Bad response: ${response}`);
        }

        jsonStream = response.Body.transformToWebStream();
        if (!jsonStream) {
          throw new Error('JSON stream is not initialized');
        }

        const reader = jsonStream.getReader();
        let read: ReadableStreamReadResult<any>;
        await async.doUntil(
          async () => {
            read = await reader.read();
            if (!read.done) {
              controller.enqueue(read.value);
            }
            return read;
          },
          async () => read.done
        );
        controller.close();
      }
    })
      .pipeThrough(new TextDecoderStream('utf-8'))
      .pipeThrough(Transform.toWeb(parseJSONL()));
  }
}
