import { AddressApi } from '../models/AddressApi';
import FormData from 'form-data';
import fs from 'fs';
import fetch, { Response as FetchResponse } from 'node-fetch';
import ExcelJS from 'exceljs';
import config from '../utils/config';
import banAddressesRepository from '../repositories/banAddressesRepository';
import db from '../repositories/db';
import { logger } from '../utils/logger';

const run = async (): Promise<void> => {
  if (config.application.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  const addressesToNormalize =
    await banAddressesRepository.listAddressesToNormalize();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet();

  worksheet.columns = [
    { header: 'addressId', key: 'addressId' },
    { header: 'addressKind', key: 'addressKind' },
    { header: 'rawAddress', key: 'rawAddress' },
    { header: 'geoCode', key: 'geoCode' },
  ];

  worksheet.addRows(
    addressesToNormalize
      .filter((value, index, self) => self.indexOf(value) === index)
      .map((address) => ({
        addressId: address.refId,
        addressKind: address.addressKind,
        rawAddress: address.rawAddress.join(' '),
        geoCode: address.geoCode ?? '',
      }))
  );

  const tmpCsvFileName = `${new Date().getTime()}.csv`;

  const csvText = await workbook.csv
    .writeFile(tmpCsvFileName)
    .then(() => {
      const form = new FormData();
      form.append('data', fs.createReadStream(tmpCsvFileName));
      form.append('citycode', 'geoCode');
      form.append('columns', 'rawAddress');
      form.append('result_columns', 'result_type');
      form.append('result_columns', 'result_housenumber');
      form.append('result_columns', 'result_street');
      form.append('result_columns', 'result_postcode');
      form.append('result_columns', 'result_city');
      form.append('result_columns', 'latitude');
      form.append('result_columns', 'longitude');
      form.append('result_columns', 'result_score');

      return fetch(`${config.ban.api.endpoint}/search/csv/`, {
        method: 'POST',
        body: form,
      });
    })
    .then((fetchResponse: FetchResponse) => fetchResponse.text());

  fs.unlinkSync(tmpCsvFileName);

  const headers = csvText.split('\n')[0].split(',');

  await banAddressesRepository.upsertList(
    csvText
      .split('\n')
      .slice(1)
      .map((line: any) => {
        const columns = line.split(',');
        return <AddressApi>{
          refId: columns[headers.indexOf('addressId')],
          addressKind: columns[headers.indexOf('addressKind')],
          houseNumber: columns[headers.indexOf('result_housenumber')],
          street: columns[headers.indexOf('result_street')],
          postalCode: columns[headers.indexOf('result_postcode')],
          city: columns[headers.indexOf('result_city')],
          latitude: columns[headers.indexOf('latitude')]
            ? Number(columns[headers.indexOf('latitude')])
            : undefined,
          longitude: columns[headers.indexOf('longitude')]
            ? Number(columns[headers.indexOf('longitude')])
            : undefined,
          score: columns[headers.indexOf('result_score')]
            ? Number(columns[headers.indexOf('result_score')])
            : undefined,
        };
      })
      .filter((_: AddressApi) => _.refId)
  );
};

run()
  .catch(console.error)
  .finally(() => db.destroy());
