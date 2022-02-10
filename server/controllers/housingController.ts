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
import ownerRepository from '../repositories/ownerRepository';

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
            ownerAddress: reduceAddressApi(housing.owner.address),
            housingRawAddress: reduceRawAddress(housing.rawAddress),
            housingAddress: reduceAddressApi(housing.address)
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
            ownerAddress: reduceAddressApi(ownerHousing.owner.address)
        }

        ownerHousing.housingList.forEach((housing, index) => {
            row[`housingRawAddress_${index}`] = reduceRawAddress(ownerHousing.housingList[index]?.rawAddress);
            row[`housingAddress_${index}`] = reduceAddressApi(housing.address)
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

    const establishmentId = request.params.establishmentId;

    const localities = await localityRepository.listByEstablishmentId(establishmentId)

    const housingList = await housingRepository.listWithFilters({localities: localities.map(_ => _.geoCode)}, 1, 10000)

    const housingAdresses = await addressService.normalizeAddresses(
        housingList.entities.map((housing: HousingApi) => ({
            addressId: housing.id,
            rawAddress: housing.rawAddress,
            inseeCode: housing.inseeCode
        }))
    )
    await housingRepository.updateAddressList(housingAdresses)

    const ownerAdresses = await addressService.normalizeAddresses(
        housingList.entities.map((housing: HousingApi) => ({
            addressId: housing.owner.id,
            rawAddress: housing.owner.rawAddress
        }))
    )

    await ownerRepository.updateAddressList(ownerAdresses)

    return response.sendStatus(200)

}


const reduceAddressApi = (addressApi?: AddressApi) => {
    return addressApi ? [addressApi.houseNumber, addressApi.street, addressApi.postalCode, addressApi.city].filter(_ => _).join(' ') : addressApi
}

const reduceRawAddress = (rawAddress?: string[]) => {
    return rawAddress ? rawAddress.filter(_ => _).join(String.fromCharCode(10)) : rawAddress
}

const housingController =  {
    list,
    listByOwner,
    exportHousingByCampaign,
    exportHousingWithFilters,
    normalizeAddresses
};

export default housingController;
