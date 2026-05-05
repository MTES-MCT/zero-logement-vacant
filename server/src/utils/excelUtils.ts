import excel, { type Workbook } from 'exceljs';
import { Response } from 'express';
import { constants } from 'http2';
import { Writable } from 'node:stream';

import { createLogger } from '~/infra/logger';

const logger = createLogger('excelUtils');

/**
 * @deprecated Use {@link createWorkbook} and {@link setResponseHeaders} instead.
 * @param fileName
 * @param response
 * @returns
 */
const initWorkbook = (fileName: string, response: Response) => {
  response.status(constants.HTTP_STATUS_ACCEPTED);
  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  response.setHeader('Transfer-Encoding', 'chunked');
  response.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

  return new excel.stream.xlsx.WorkbookWriter({
    stream: response
  });
};

/**
 * Create a workbook and pipe it to a stream.
 * @param stream
 * @returns
 */
function createWorkbook(stream: Writable) {
  return new excel.stream.xlsx.WorkbookWriter({ stream });
}

export interface SetResponseHeadersOptions {
  fileName?: string;
}

/**
 * Set the response headers for an Excel file download.
 * @param response
 * @param options
 */
function setResponseHeaders(
  response: Response,
  options?: SetResponseHeadersOptions
): void {
  const createdAt = new Date()
    .toJSON()
    .substring(0, 'yyyy-mm-ddThh:mm:ss'.length)
    .replace(/[-:T]/g, '');
  const file = options?.fileName ?? `${createdAt}.xlsx`;

  response.status(constants.HTTP_STATUS_ACCEPTED);
  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  response.setHeader('Transfer-Encoding', 'chunked');
  response.setHeader('Content-Disposition', 'attachment; filename=' + file);
}

const GREY_FILL: excel.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' }
};

const DEFAULT_COLUMN_WIDTH = 22;

export interface WorksheetOptions<A extends Record<string, unknown>> {
  name: string;
  columns: Array<Partial<excel.Column> & { key: keyof A }>;
  /**
   * When true, applies alternating white/grey fill on columns for readability.
   * Also sets a default column width for better readability.
   */
  alternateColumnColors?: boolean;
}

/**
 * Enhance column definitions with default widths and optional alternating grey fill.
 */
function withColumnOptions<A extends Record<string, unknown>>(
  columns: WorksheetOptions<A>['columns'],
  alternateColumnColors: boolean
): WorksheetOptions<A>['columns'] {
  return columns.map((col, i) => ({
    ...col,
    width: col.width ?? DEFAULT_COLUMN_WIDTH,
    style: alternateColumnColors && i % 2 !== 0 ? { fill: GREY_FILL } : undefined
  }));
}

/**
 * Create a worksheet and write a stream of chunks,
 * optionally mapping each chunk.
 *
 * Removes the worksheet in case of error.
 *
 * @param workbook
 * @param options
 * @returns
 */
function createWorksheet<A extends Record<string, unknown>>(
  workbook: Workbook,
  options: WorksheetOptions<A>
) {
  const { name, alternateColumnColors } = options;
  const columns = withColumnOptions(options.columns, alternateColumnColors ?? false);

  return new WritableStream<A>({
    start() {
      const worksheet = workbook.addWorksheet(name);
      worksheet.columns = columns;
    },
    write(chunk) {
      logger.debug('Processing chunk...', chunk);
      const row = workbook.getWorksheet(name)?.addRow(chunk);
      if (row) {
        row.commit();
      }
      logger.debug('Wrote row', chunk);
    },
    close() {
      workbook.getWorksheet(name)?.commit();
    },
    abort(error) {
      logger.error('Error while writing worksheet', error);
    }
  });
}

export default {
  initWorkbook,
  createWorkbook,
  createWorksheet,
  setResponseHeaders
};
