import { match } from 'ts-pattern';

import type { SourceRepository } from '../import-lovac/infra';
import { SourceFileRepository } from '../import-lovac/infra/source-file-repository';
import {
  SourceS3Repository,
  type S3RepositoryConfig
} from '../import-lovac/infra/source-s3-repository';

class GenericSourceFileRepository<A>
  extends SourceFileRepository<A>
  implements SourceRepository<A>
{
  protected columns: string[] | true = true;

  constructor(protected file: string) {
    super(file);
  }
}

class GenericSourceS3Repository<A>
  extends SourceS3Repository<A>
  implements SourceRepository<A>
{
  constructor(
    protected file: string,
    protected config: S3RepositoryConfig
  ) {
    super(file, config);
  }
}

interface FileRepositoryOptions {
  from: 'file';
  file: string;
}

interface S3RepositoryOptions extends S3RepositoryConfig {
  from: 's3';
  file: string;
}

export type SourceRepositoryOptions =
  | FileRepositoryOptions
  | S3RepositoryOptions;

export function createGenericSourceRepository<A>(
  options: SourceRepositoryOptions
): SourceRepository<A> {
  return match(options)
    .with(
      { from: 'file' },
      (opts) => new GenericSourceFileRepository<A>(opts.file)
    )
    .with(
      { from: 's3' },
      (opts) => new GenericSourceS3Repository<A>(opts.file, opts)
    )
    .exhaustive();
}
