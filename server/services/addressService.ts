import { AddressApi } from '../models/AddressApi';
import FormData from 'form-data';
import fs from 'fs';
import fetch, { Response as FetchResponse } from 'node-fetch';
import ExcelJS from 'exceljs';

const normalizeAdresses = async (addresses: string[][]): Promise<AddressApi[]> => {

    const workbook = new ExcelJS.Workbook();
    var worksheet = workbook.addWorksheet();

    console.log('addresses[0]', addresses[0])

    worksheet.columns = addresses[0].map((column, index) => ({
        header: `Column ${index}`, key: index.toString()
    }));

    worksheet.addRows(addresses);

    const tmpCsvFileName = `${new Date().getTime()}.csv`;

    return workbook.csv.writeFile(tmpCsvFileName)
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
        .then((text: string) => {
            const headers = text.split('\n')[0].split(',')
            console.log('headers', headers)
            console.log('headers.indexOf(\'result_housenumber\')', headers.indexOf('result_housenumber'))
            return text.split('\n').slice(1).map(line => {
                const columns = line.split(',')
                return <AddressApi>{
                    houseNumber: columns[headers.indexOf('result_housenumber')],
                    street: ['street', 'housenumber'].indexOf(columns[headers.indexOf('result_type')]) !== -1 ? columns[headers.indexOf('result_name')] : undefined,
                    postCode: columns[headers.indexOf('result_postcode')],
                    city: columns[headers.indexOf('result_city')],
                }
            })
        })
}

export default {
    normalizeAdresses
}
