import { DuckDBInstance } from '@duckdb/node-api';
import { ReadableStream } from 'node:stream/web';

import { SourceRepository, StreamOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from './source-housing';

class ParquetSourceHousingRepository
  implements SourceRepository<SourceHousing>
{
  constructor(private readonly filePath: string) {}

  stream(_options?: StreamOptions): ReadableStream<SourceHousing> {
    const { filePath } = this;

    return new ReadableStream<SourceHousing>({
      async start(controller) {
        const instance = await DuckDBInstance.create(':memory:');
        const connection = await instance.connect();
        try {
          const reader = await connection.runAndReadAll(
            `SELECT * FROM read_parquet(?)`,
            [filePath]
          );
          for (const row of reader.getRowObjects()) {
            controller.enqueue(row as SourceHousing);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          connection.closeSync();
          instance.closeSync();
        }
      }
    });
  }
}

export function createParquetSourceHousingRepository(
  filePath: string
): SourceRepository<SourceHousing> {
  return new ParquetSourceHousingRepository(filePath);
}
