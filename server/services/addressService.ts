import { AddressApi } from '../models/AddressApi';
import FormData from 'form-data';
import fs from 'fs';
import fetch, { Response as FetchResponse } from 'node-fetch';
import ExcelJS from 'exceljs';
import housingRepository from '../repositories/housingRepository';
import { HousingApi } from '../models/HousingApi';
import ownerRepository from '../repositories/ownerRepository';


const normalizeEstablishmentAddresses = async (establishmentId: string) => {

    console.log('Normalize establishment addresses', establishmentId)

    const page = 1
    const perPage = 1000
    const tempo = 60000

    const housingCount = await housingRepository.countWithFilters({establishmentIds: [establishmentId]})

    return Promise.all(
        new Array(Math.floor(housingCount / perPage) + 1).fill(0)
            .map((_: any, index: any) =>
                housingRepository.listWithFilters( {establishmentIds: [establishmentId]}, page + index, perPage)
                    .then(housingList => {
                        setTimeout(() => normalizeHousingAddresses(housingList.entities), index * tempo)
                        setTimeout(() => normalizeOwnerAddresses(housingList.entities), (index + 0.5) * tempo)
                    })
            )
    )
}

const normalizeHousingAddresses =  (housingList: HousingApi[]): Promise<HousingApi[]> => {

    console.log('Normalize housing addresses', housingList.length)

    return normalizeAddresses(
        housingList.map((housing: HousingApi) => ({
            addressId: housing.id,
            rawAddress: housing.rawAddress,
            inseeCode: housing.inseeCode
        }))
    ).then(housingAdresses => housingRepository.updateAddressList(housingAdresses))
}


const normalizeOwnerAddresses = (housingList: HousingApi[]): Promise<HousingApi[]> => {

    console.log('Normalize owner addresses', housingList.length)

    return normalizeAddresses(
        housingList.map((housing: HousingApi) => ({
            addressId: housing.owner.id,
            rawAddress: housing.owner.rawAddress
        }))
    ).then(ownerAdresses => ownerRepository.updateAddressList(ownerAdresses))
}


const normalizeAddresses = async (addresses: {addressId: string, rawAddress: string[], inseeCode?: string}[]): Promise<{ addressId: string, addressApi: AddressApi }[]> => {

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet();

    worksheet.columns = [
        { header: 'addressId', key: 'addressId' },
        { header: 'rawAddress', key: 'rawAddress' },
        { header: 'inseeCode', key: 'inseeCode' }
    ];

    worksheet.addRows(addresses
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(address => ({
            addressId: address.addressId,
            rawAddress: address.rawAddress.join(' '),
            inseeCode: address.inseeCode
        }))
    );

    const tmpCsvFileName = `${new Date().getTime()}.csv`;

    const csvText = await workbook.csv.writeFile(tmpCsvFileName)
        .then(() => {
            const form = new FormData();
            form.append('data', fs.createReadStream(tmpCsvFileName));
            form.append('citycode', 'inseeCode');
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
        return <{ addressId: string, addressApi: AddressApi }>{
            addressId: columns[headers.indexOf('addressId')],
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
    normalizeHousingAddresses,
    normalizeOwnerAddresses,
    normalizeEstablishmentAddresses
}
