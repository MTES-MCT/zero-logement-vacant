import ExcelJS from 'exceljs';
import { Response } from 'express';

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
  initWorkbook,
};
