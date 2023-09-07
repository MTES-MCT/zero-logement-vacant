import ExcelJS, { Worksheet } from 'exceljs';
import { Response } from 'express';

const formatWorksheet = (worksheet: Worksheet) => {
  worksheet.columns.forEach((column) => {
    const lengths = column.values
      ?.filter((v) => v !== undefined)
      .map((v) => (v ?? '').toString().length) ?? [10];
    column.width = Math.max(...lengths);
  });
};

const initWorkbook = (fileName: string, response: Response) => {
  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  response.setHeader('Transfer-Encoding', 'chunked');
  response.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

  return new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: response,
  });
};

export default {
  formatWorksheet,
  initWorkbook,
};
