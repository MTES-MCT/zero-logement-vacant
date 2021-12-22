import { Request, Response } from 'express';
import addressService from '../services/addressService';
import housingRepository from '../repositories/housingRepository';
import { HousingApi } from '../models/HousingApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import ExcelJS from 'exceljs';
import { AddressApi } from '../models/AddressApi';
import localityRepository from '../repositories/localityRepository';
import { RequestUser } from '../models/UserApi';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List housing')

    const page = request.body.page;
    const perPage = request.body.perPage;
    const establishmentId = (<RequestUser>request.user).establishmentId;
    const filters = <HousingFiltersApi> request.body.filters ?? {};

    const userLocalities = await localityRepository.listByEstablishmentId(establishmentId).then(_ => _.map(_ => _.geoCode))

    const filterLocalities = (filters.localities ?? []).length ? userLocalities.filter(l => (filters.localities ?? []).indexOf(l) !== -1) : userLocalities

    return housingRepository.list({...filters, localities: filterLocalities}, page, perPage)
        .then(_ => response.status(200).json(_));
};

const listByOwner = async (request: Request, response: Response): Promise<Response> => {

    const ownerId = request.params.ownerId;

    console.log('List housing by owner', ownerId)

    return housingRepository.list({ownerIds: [ownerId]})
        .then(_ => response.status(200).json(_.entities));
};

const exportByCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Export housing by campaign', campaignId)

    const campaignApi = await campaignRepository.get(campaignId)
    const housingList = await housingRepository.list({campaignIds: [campaignId]}).then(_ => _.entities)

    const fileName = `${campaignApi.campaignNumber}.xlsx`;

    const housingAdresses = await addressService.normalizeAddresses(
        housingList.map((housing: HousingApi) => ({
            housingId: housing.id,
            rawAddress: housing.rawAddress
        }))
    )

    const ownerAdresses = await addressService.normalizeAddresses(
        housingList.map((housing: HousingApi) => ({
            housingId: housing.owner.id,
            rawAddress: housing.owner.rawAddress
        }))
    )

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Logements');

    worksheet.columns = [
        { header: 'Invariant', key: 'invariant' },
        { header: 'Propriétaire', key: 'owner' },
        { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
        { header: 'Adresse BAN du propriétaire', key: 'ownerAddress' },
        { header: 'Adresse LOVAC du logement', key: 'housingRawAddress' },
        { header: 'Adresse BAN du logement', key: 'housingAddress' }
    ];

    const reduceAddressApi = (addressApi: AddressApi) => {
        return `${addressApi.houseNumber} ${addressApi.street} ${addressApi.postalCode} ${addressApi.city}`
    }

    const reduceRawAddress= (rawAddress: string[]) => {
        return rawAddress.filter(_ => _).reduce((a1, a2) =>`${a1}${String.fromCharCode(10)}${a2}`)
    }

    housingList.map((housing: HousingApi, index: number) => {
        worksheet.addRow({
            invariant: housing.invariant,
            owner: housing.owner.fullName,
            ownerRawAddress: reduceRawAddress(housing.owner.rawAddress),
            ownerAddress: reduceAddressApi(ownerAdresses[index].addressApi),
            housingRawAddress: reduceRawAddress(housing.rawAddress),
            housingAddress: reduceAddressApi(housingAdresses[index].addressApi)
        });
    })

    worksheet.columns.forEach(column => {
        const lengths = column.values?.filter(v => v !== undefined).map(v => (v ?? "").toString().length) ?? [10];
        column.width = Math.max(...lengths);
    });

    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader("Content-Disposition", "attachment; filename=" + fileName);

    return workbook.xlsx.write(response)
        .then(() => {
            response.end();
            return response;
        })

}

const normalizeAddresses = async (request: Request, response: Response): Promise<Response> => {

    console.log('Normalize address')

    const housingList = await housingRepository.list({}, 0, 10000)

    const housingAdresses = await addressService.normalizeAddresses(
        housingList.entities.map((housing: HousingApi) => ({
            housingId: housing.id,
            rawAddress: housing.rawAddress
        }))
    )

    const update = 'UPDATE housing as h SET ' +
    'postal_code = c.postal_code, house_number = c.house_number, street = c.street, city = c.city ' +
    'FROM (values' +
        housingAdresses // TODO filter only results with same latitude and longitude
            .filter(ha => ha.housingId)
            .map(ha => `('${ha.housingId}', '${ha.addressApi.postalCode}', '${ha.addressApi.houseNumber ?? ''}', '${escapeValue(ha.addressApi.street)}', '${escapeValue(ha.addressApi.city)}')`)
     +
    ') as c(id, postal_code, house_number, street, city)' +
    ' WHERE h.id::text = c.id'

    await housingRepository.rawUpdate(update)

    return response.status(200).json(housingAdresses)

}

const escapeValue = (value?: string) => {
    return value ? value.replace(/'/g, '\'\'') : ''
}

const housingController =  {
    list,
    listByOwner,
    exportByCampaign,
    normalizeAddresses
};

export default housingController;
