import ExcelJS from 'exceljs';
import { Response } from 'express';
import { constants } from 'http2';

const initWorkbook = (fileName: string, response: Response) => {
  response.status(constants.HTTP_STATUS_ACCEPTED);
  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  response.setHeader('Transfer-Encoding', 'chunked');
  response.setHeader('Content-Disposition', 'attachment; filename=' + fileName);

  return new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: response
  });
};

export default {
  initWorkbook
};
