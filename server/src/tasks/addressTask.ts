import { parse as fromCSV } from 'csv-parse/sync';
import { stringify as toCSV } from 'csv-stringify/sync';

import { AddressKinds } from '@zerologementvacant/models';
import config from '~/infra/config';
import db from '~/infra/database/';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import { AddressApi } from '~/models/AddressApi';
import { createLogger } from '~/infra/logger';

const logger = createLogger('addressTask');

async function run(): Promise<void> {
  logger.info('Starting address task...');

  const addressesToNormalize =
    await banAddressesRepository.listAddressesToNormalize();
  logger.debug(`Found ${addressesToNormalize.length} dirty addresses...`);

  const csv = toCSV(addressesToNormalize, {
    header: true,
    columns: ['refId', 'addressKind', 'label', 'geoCode']
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const form = new FormData();
  form.append('data', blob, 'search.csv');
  form.append('columns', 'refId');
  form.append('columns', 'addressKind');
  form.append('columns', 'label');
  form.append('columns', 'geoCode');
  // Tells the API that geoCode is an INSEE code
  form.append('citycode', 'geoCode');
  form.append('result_columns', 'result_label');
  form.append('result_columns', 'result_type');
  form.append('result_columns', 'result_housenumber');
  form.append('result_columns', 'result_street');
  form.append('result_columns', 'result_postcode');
  form.append('result_columns', 'result_city');
  form.append('result_columns', 'latitude');
  form.append('result_columns', 'longitude');
  form.append('result_columns', 'result_score');

  const response = await fetch(`${config.ban.api.endpoint}/search/csv/`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error((error as { message: string }).message);
  }
  const text = await response.text();
  const records: ReadonlyArray<BANAddress> = fromCSV(text, { columns: true });
  const addresses: ReadonlyArray<AddressApi> = records.map<AddressApi>(
    (record) => ({
      refId: record.refId,
      addressKind: record.addressKind as AddressKinds,
      label: record.result_label,
      houseNumber: record.result_housenumber,
      street: record.result_street,
      postalCode: record.result_postcode,
      city: record.result_city,
      latitude: record.latitude ? Number(record.latitude) : undefined,
      longitude: record.longitude ? Number(record.longitude) : undefined,
      score: record.result_score ? Number(record.result_score) : undefined,
      lastUpdatedAt: new Date().toJSON()
    })
  );
  await banAddressesRepository.saveMany(addresses);
  logger.info('Address task done.');
}

interface BANAddress {
  refId: string;
  addressKind: string;
  result_label: string;
  result_housenumber: string;
  result_street: string;
  result_postcode: string;
  result_city: string;
  latitude: string;
  longitude: string;
  result_score: string;
}

run().finally(() => db.destroy());
