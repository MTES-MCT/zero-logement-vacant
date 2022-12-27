import { Worksheet, Workbook } from 'exceljs';
import { Response } from 'express';

const formatWorksheet = (worksheet: Worksheet) => {
  worksheet.columns.forEach((column) => {
    const lengths = column.values
      ?.filter((v) => v !== undefined)
      .map((v) => (v ?? '').toString().length) ?? [10];
    column.width = Math.max(...lengths);
  });
};

const formatWorkbook = (workbook: Workbook) => {
  workbook.worksheets.forEach((worksheet) => formatWorksheet(worksheet));
};

const sendWorkbook = (
  workbook: Workbook,
  fileName: string,
  response: Response
): Promise<Response> => {
  formatWorkbook(workbook);

  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  response.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

  return workbook.xlsx.write(response).then(() => {
    response.end();
    return response;
  });
};

export default {
  sendWorkbook,
};
