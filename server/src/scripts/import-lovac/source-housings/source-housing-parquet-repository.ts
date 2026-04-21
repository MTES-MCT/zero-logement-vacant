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
            `SELECT * EXCLUDE (dept) FROM (
               SELECT * REPLACE (
                 CAST(ban_id AS VARCHAR) AS ban_id,
                 CAST(rooms_count AS INTEGER) AS rooms_count,
                 CAST(cadastral_classification AS INTEGER) AS cadastral_classification,
                 CAST(rental_value AS INTEGER) AS rental_value,
                 CAST(vacancy_start_year AS INTEGER) AS vacancy_start_year,
                 CAST(building_year AS INTEGER) AS building_year,
                 CAST(last_transaction_value AS INTEGER) AS last_transaction_value,
                 CAST(mutation_date AS VARCHAR) AS mutation_date,
                 CAST(last_mutation_date AS VARCHAR) AS last_mutation_date,
                 CAST(last_transaction_date AS VARCHAR) AS last_transaction_date
               ) FROM read_parquet('${filePath}')
             )`,
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
