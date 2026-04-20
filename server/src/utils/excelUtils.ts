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
 * Apply alternating grey fill on even-indexed columns (1-based: 2, 4, 6...).
 */
function applyAlternateColumnFill(
  row: excel.Row,
  columnCount: number
): void {
  for (let i = 1; i <= columnCount; i++) {
    if (i % 2 === 0) {
      row.getCell(i).fill = GREY_FILL;
    }
  }
}

/**
 * Enhance column definitions with default widths.
 */
function withDefaultWidths<A extends Record<string, unknown>>(
  columns: WorksheetOptions<A>['columns']
): WorksheetOptions<A>['columns'] {
  return columns.map((col) => ({
    ...col,
    width: col.width ?? DEFAULT_COLUMN_WIDTH
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
  const columns = alternateColumnColors
    ? withDefaultWidths(options.columns)
    : options.columns;
  const columnCount = columns.length;

  return new WritableStream<A>({
    start() {
      const worksheet = workbook.addWorksheet(name);
      worksheet.columns = columns;
      if (alternateColumnColors) {
        applyAlternateColumnFill(worksheet.getRow(1), columnCount);
      }
    },
    write(chunk) {
      logger.debug('Processing chunk...', chunk);
      const row = workbook.getWorksheet(name)?.addRow(chunk);
      if (row) {
        if (alternateColumnColors) {
          applyAlternateColumnFill(row, columnCount);
        }
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
