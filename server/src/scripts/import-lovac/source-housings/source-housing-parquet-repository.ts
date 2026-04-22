import { DuckDBInstance } from '@duckdb/node-api';
import { ReadableStream } from 'node:stream/web';

import { SourceRepository, StreamOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from './source-housing';

export interface ParquetSourceHousingRepository
  extends SourceRepository<SourceHousing> {
  count(): Promise<number>;
}

class ParquetSourceHousingRepositoryImpl
  implements ParquetSourceHousingRepository
{
  constructor(private readonly filePath: string) {}

  async count(): Promise<number> {
    const instance = await DuckDBInstance.create(':memory:');
    const connection = await instance.connect();
    try {
      const reader = await connection.runAndReadAll(
        `SELECT COUNT(*)::BIGINT AS n FROM read_parquet('${this.filePath}')`
      );
      return Number((reader.getRowObjects()[0] as { n: bigint }).n);
    } finally {
      connection.closeSync();
      instance.closeSync();
    }
  }

  stream(_options?: StreamOptions): ReadableStream<SourceHousing> {
    const { filePath } = this;

    return new ReadableStream<SourceHousing>({
      async start(controller) {
        const instance = await DuckDBInstance.create(':memory:');
        const connection = await instance.connect();
        try {
          // Read parquet and coerce DuckDB native types to JS-friendly ones
          await connection.run(`
            CREATE TEMP VIEW raw AS SELECT * FROM read_parquet('${filePath}');
          `);
          // Only EXCLUDE dept if the column exists (hive-partitioned files)
          const colsResult = await connection.runAndReadAll(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'raw'`
          );
          const colNames = colsResult
            .getRowObjects()
            .map((r) => (r as { column_name: string }).column_name);
          const excludeDept = colNames.includes('dept')
            ? 'EXCLUDE (dept)'
            : '';

          // Build REPLACE list for columns that exist
          const casts: Record<string, string> = {
            ban_id: 'VARCHAR',
            rooms_count: 'INTEGER',
            cadastral_classification: 'INTEGER',
            rental_value: 'INTEGER',
            vacancy_start_year: 'INTEGER',
            building_year: 'INTEGER',
            last_transaction_value: 'INTEGER',
            mutation_date: 'VARCHAR',
            last_mutation_date: 'VARCHAR',
            last_transaction_date: 'VARCHAR'
          };
          const replaceParts = Object.entries(casts)
            .filter(([col]) => colNames.includes(col))
            .map(([col, type]) => `CAST(${col} AS ${type}) AS ${col}`);
          const replaceClause =
            replaceParts.length > 0
              ? `REPLACE (${replaceParts.join(', ')})`
              : '';

          const reader = await connection.runAndReadAll(
            `SELECT * ${excludeDept} ${replaceClause} FROM raw`
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
): ParquetSourceHousingRepository {
  return new ParquetSourceHousingRepositoryImpl(filePath);
}
