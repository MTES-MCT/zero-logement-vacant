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
import { OwnerApi } from '../models/OwnerApi';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List housing')

    const page = request.body.page;
    const perPage = request.body.perPage;
    const establishmentId = (<RequestUser>request.user).establishmentId;
    const filters = <HousingFiltersApi> request.body.filters ?? {};

    const userLocalities = await localityRepository.listByEstablishmentId(establishmentId).then(_ => _.map(_ => _.geoCode))

    const filterLocalities = (filters.localities ?? []).length ? userLocalities.filter(l => (filters.localities ?? []).indexOf(l) !== -1) : userLocalities

    return housingRepository.listWithFilters({...filters, localities: filterLocalities}, page, perPage)
        .then(_ => response.status(200).json(_));
};

const listByOwner = async (request: Request, response: Response): Promise<Response> => {

    const ownerId = request.params.ownerId;

    console.log('List housing by owner', ownerId)

    return housingRepository.listWithFilters({ownerIds: [ownerId]})
        .then(_ => response.status(200).json(_.entities));
};

const exportHousingByCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Export housing by campaign', campaignId)

    const campaignApi = await campaignRepository.get(campaignId)
    const housingList = await housingRepository.listWithFilters({campaignIds: [campaignId]}).then(_ => _.entities)

    const fileName = `C${campaignApi.campaignNumber}.xlsx`;

    return await exportHousingList(housingList, fileName, response);

}

const exportHousingWithFilters = async (request: Request, response: Response): Promise<Response> => {

    console.log('Export housing with filters')

    const establishmentId = (<RequestUser>request.user).establishmentId;

    const filters = <HousingFiltersApi> request.body.filters ?? {};
    const allHousing = request.body.allHousing;

    const userLocalities = await localityRepository.listByEstablishmentId(establishmentId).then(_ => _.map(_ => _.geoCode))
    const filterLocalities = (filters.localities ?? []).length ? userLocalities.filter(l => (filters.localities ?? []).indexOf(l) !== -1) : userLocalities

    const housingIds = allHousing ?
        await housingRepository.listWithFilters({...filters, localities: filterLocalities})
            .then(_ => _.entities
                .map(_ => _.id)
                .filter(id => request.body.housingIds.indexOf(id) === -1)
            ):
        request.body.housingIds;

    const housingList = await housingRepository.listByIds(housingIds)

    const fileName = `export_${(new Date()).toDateString()}.xlsx`;

    return await exportHousingList(housingList, fileName, response);

}

const exportHousingList = async (housingList: HousingApi[], fileName: string, response: Response): Promise<Response> => {


    console.log('housingList', housingList.map((housing: HousingApi) => ({
        housingId: housing.owner.id,
        rawAddress: housing.owner.rawAddress
    })))

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
    const housingWorksheet = workbook.addWorksheet('Logements');
    const ownerWorksheet = workbook.addWorksheet('Propriétaires');

    housingWorksheet.columns = [
        { header: 'Invariant', key: 'invariant' },
        { header: 'Propriétaire', key: 'owner' },
        { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
        { header: 'Adresse BAN du propriétaire', key: 'ownerAddress' },
        { header: 'Adresse LOVAC du logement', key: 'housingRawAddress' },
        { header: 'Adresse BAN du logement', key: 'housingAddress' }
    ];

    housingList.map((housing: HousingApi) => {
        housingWorksheet.addRow({
            invariant: housing.invariant,
            owner: housing.owner.fullName,
            ownerRawAddress: reduceRawAddress(housing.owner.rawAddress),
            ownerAddress: reduceAddressApi(ownerAdresses.find(_ => _.housingId === housing.owner.id)?.addressApi),
            housingRawAddress: reduceRawAddress(housing.rawAddress),
            housingAddress: reduceAddressApi(housingAdresses.find(_ => _.housingId === housing.id)?.addressApi)
        });
    })

    housingWorksheet.columns.forEach(column => {
        const lengths = column.values?.filter(v => v !== undefined).map(v => (v ?? "").toString().length) ?? [10];
        column.width = Math.max(...lengths);
    });

    const housingListByOwner = housingList.reduce((ownersHousing: {owner: OwnerApi, housingList: HousingApi[]}[], housing) => [
        ...ownersHousing.filter(_ => _.owner.id !== housing.owner.id),
        {
            owner: housing.owner,
            housingList: [
                ...(ownersHousing.find(_ => _.owner.id === housing.owner.id)?.housingList ?? []),
                housing
            ]
        }
    ], [])

    const maxHousingCount = Math.max(...housingListByOwner.map(_ => _.housingList.length))

    ownerWorksheet.columns = [
        { header: 'Propriétaire', key: 'owner' },
        { header: 'Adresse LOVAC du propriétaire', key: 'ownerRawAddress' },
        { header: 'Adresse BAN du propriétaire', key: 'ownerAddress' },
        ...[...Array(maxHousingCount).keys()].map(index => [
            { header: `Adresse LOVAC du logement ${index + 1}`, key: `housingRawAddress_${index}` },
            { header: `Adresse BAN du logement ${index + 1}`, key: `housingAddress_${index}` },
        ]).flat()
    ];

    housingListByOwner.map((ownerHousing: {owner: OwnerApi, housingList: HousingApi[]}) => {
        const row: any = {
            owner: ownerHousing.owner.fullName,
            ownerRawAddress: reduceRawAddress(ownerHousing.owner.rawAddress),
            ownerAddress: reduceAddressApi(ownerAdresses.find(_ => _.housingId === ownerHousing.owner.id)?.addressApi)
        }

        ownerHousing.housingList.forEach((housing, index) => {
            row[`housingRawAddress_${index}`] = reduceRawAddress(ownerHousing.housingList[index]?.rawAddress);
            row[`housingAddress_${index}`] = reduceAddressApi(housingAdresses.find(_ => _.housingId === housing.id)?.addressApi)
        })

        ownerWorksheet.addRow(row);
    })

    ownerWorksheet.columns.forEach(column => {
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

    const housingList = await housingRepository.listWithFilters({}, 0, 10000)

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


const reduceAddressApi = (addressApi?: AddressApi) => {
    return addressApi ? [addressApi.houseNumber, addressApi.street, addressApi.postalCode, addressApi.city].filter(_ => _).join(' ') : addressApi
}

const reduceRawAddress = (rawAddress?: string[]) => {
    return rawAddress ? rawAddress.filter(_ => _).join(String.fromCharCode(10)) : rawAddress
}

const escapeValue = (value?: string) => {
    return value ? value.replace(/'/g, '\'\'') : ''
}

const housingController =  {
    list,
    listByOwner,
    exportHousingByCampaign,
    exportHousingWithFilters,
    normalizeAddresses
};

export default housingController;
