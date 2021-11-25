import config from '../utils/config';
import { Request, Response } from 'express';
import addressService from '../services/addressService';
import housingRepository from '../repositories/housingRepository';
import { HousingApi } from '../models/HousingApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import campaignRepository from '../repositories/campaignRepository';
import ExcelJS from 'exceljs';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List housing')

    const page = request.body.page;
    const perPage = request.body.perPage;
    const filters = <HousingFiltersApi> request.body.filters ?? {};

    return housingRepository.list(filters, page, perPage)
        .then(_ => response.status(200).json(_));
};

const listByOwner = async (request: Request, response: Response): Promise<Response> => {

    const ownerId = request.params.ownerId;

    console.log('List housing by owner', ownerId)

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('🏡 Adresses').select({
        maxRecords: 500,
        fields: [
            'Adresse',
            'Nom de la commune du logement',
            'Surface habitable',
            'Type de logement',
            'Nombre de pièces',
            'Année de construction',
            'Début de la vacance'
        ],
        filterByFormula: `{Record-ID=proprietaire} = '${ownerId}'`
    })
        .all()
        .then((results: any) => {
            return response.status(200).json(results.map((result: any) => ({
                id: result.id,
                address: result.fields['Adresse'],
                municipality: result.fields['Nom de la commune du logement'],
                kind: result.fields['Type de logement'].trimRight() === 'MAISON' ? 'Maison' : result.fields['Type de logement'].trimRight() === 'APPART' ? 'Appartement' : undefined,
                surface: result.fields['Surface habitable'],
                rooms: result.fields['Nombre de pièces'],
                buildingYear: result.fields['Année de construction'],
                vacancyStart: result.fields['Début de la vacance'],
            })));
        })
        .catch((_: any) => console.error(_));
};

const listByCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    const page = 1; // request.body.page;
    const perPage = 100; //request.body.perPage;

    console.log('List housing by campaign', campaignId)

    return housingRepository.list({campaignIds: [campaignId]}, (page - 1) * perPage, perPage)
        .then(_ => response.status(200).json(_));
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
        { header: 'Civilité', key: 'civility' },
        { header: 'Propriétaire', key: 'owner' },
        { header: 'Numéro du propriétaire', key: 'ownerNumber' },
        { header: 'Rue du propriétaire', key: 'ownerStreet' },
        { header: 'Code postal du propriétaire', key: 'ownerPostCode' },
        { header: 'Commune du propriétaire', key: 'ownerCity' },
        { header: 'Numéro du logement', key: 'housingNumber' },
        { header: 'Rue du logement', key: 'housingStreet' },
        { header: 'Code postal du logement', key: 'housingPostCode' },
        { header: 'Commune du logement', key: 'housingCity' },
    ];

    housingList.map((housing: HousingApi, index: number) => {
        worksheet.addRow({
            invariant: housing.invariant,
            civility: '', //TODO
            owner: housing.owner.fullName,
            ownerNumber: ownerAdresses[index].addressApi.houseNumber,
            ownerStreet: ownerAdresses[index].addressApi.street,
            ownerPostCode: ownerAdresses[index].addressApi.postalCode,
            ownerCity: ownerAdresses[index].addressApi.city,
            housingNumber: housingAdresses[index].addressApi.houseNumber,
            housingStreet: housingAdresses[index].addressApi.street,
            housingPostCode: housingAdresses[index].addressApi.postalCode,
            housingCity: housingAdresses[index].addressApi.city,
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

    console.log('update', update)


    await housingRepository.rawUpdate(update)

    return response.status(200).json(housingAdresses)

}

const escapeValue = (value?: string) => {
    return value ? value.replace(/'/g, '\'\'') : ''
}

const housingController =  {
    list,
    listByOwner,
    listByCampaign,
    exportByCampaign,
    normalizeAddresses
};

export default housingController;
