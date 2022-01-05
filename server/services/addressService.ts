import { AddressApi } from '../models/AddressApi';
import FormData from 'form-data';
import fs from 'fs';
import fetch, { Response as FetchResponse } from 'node-fetch';
import ExcelJS from 'exceljs';

const normalizeAdressesOld = async (addresses: string[][]): Promise<AddressApi[]> => {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet();

    worksheet.columns = addresses[0].map((column, index) => ({
        header: `Column ${index}`, key: index.toString()
    }));

    worksheet.addRows(addresses);

    const tmpCsvFileName = `${new Date().getTime()}.csv`;

    const csvText = await workbook.csv.writeFile(tmpCsvFileName)
        .then(() => {
            const form = new FormData();
            form.append('data', fs.createReadStream(tmpCsvFileName));
            form.append('result_columns', 'result_type');
            form.append('result_columns', 'result_housenumber');
            form.append('result_columns', 'result_name');
            form.append('result_columns', 'result_postcode');
            form.append('result_columns', 'result_city');

            return fetch('https://api-adresse.data.gouv.fr/search/csv/', {
                method: 'POST',
                body: form,
            });
        })
        .then((fetchResponse: FetchResponse) => fetchResponse.text())

    fs.unlinkSync(tmpCsvFileName)

    const headers = csvText.split('\n')[0].split(',')

    return csvText.split('\n').slice(1).map(line => {
        const columns = line.split(',')
        return <AddressApi>{
            houseNumber: columns[headers.indexOf('result_housenumber')],
            street: ['street', 'housenumber'].indexOf(columns[headers.indexOf('result_type')]) !== -1 ? columns[headers.indexOf('result_name')] : undefined,
            postalCode: columns[headers.indexOf('result_postcode')],
            city: columns[headers.indexOf('result_city')],
        }
    })
}

const normalizeAddresses = async (addresses: {housingId: string, rawAddress: string[]}[]): Promise<{ housingId: string, addressApi: AddressApi }[]> => {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet();

    worksheet.columns = [
        { header: 'housingId', key: 'housingId' },
        { header: 'rawAddress', key: 'rawAddress' }
    ];

    worksheet.addRows(addresses.map(address => ({
        housingId: address.housingId,
        rawAddress: address.rawAddress.join(' ')
    })));

    const tmpCsvFileName = `${new Date().getTime()}.csv`;

    const csvText = await workbook.csv.writeFile(tmpCsvFileName)
        .then(() => {
            const form = new FormData();
            form.append('data', fs.createReadStream(tmpCsvFileName));
            form.append('columns', 'rawAddress');
            form.append('result_columns', 'result_type');
            form.append('result_columns', 'result_housenumber');
            form.append('result_columns', 'result_name');
            form.append('result_columns', 'result_postcode');
            form.append('result_columns', 'result_city');

            return fetch('https://api-adresse.data.gouv.fr/search/csv/', {
                method: 'POST',
                body: form,
            });
        })
        .then((fetchResponse: FetchResponse) => fetchResponse.text())

    fs.unlinkSync(tmpCsvFileName)

    const headers = csvText.split('\n')[0].split(',')

    return csvText.split('\n').slice(1).map(line => {
        const columns = line.split(',')
        return <{ housingId: string, addressApi: AddressApi }>{
            housingId: columns[headers.indexOf('housingId')],
            addressApi: {
                houseNumber: columns[headers.indexOf('result_housenumber')],
                street: ['street', 'housenumber'].indexOf(columns[headers.indexOf('result_type')]) !== -1 ? columns[headers.indexOf('result_name')] : undefined,
                postalCode: columns[headers.indexOf('result_postcode')],
                city: columns[headers.indexOf('result_city')],
            }
        }
    })
}

export default {
    normalizeAddresses,
    normalizeAdressesOld
}
