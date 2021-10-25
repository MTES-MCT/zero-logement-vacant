import config from '../utils/config';
import { Request, Response } from 'express';
import campaignHousingRepository from '../repositories/campaignHousingRepository';
import campaignRepository from '../repositories/campaignRepository';
import ExcelJS from 'exceljs';
import addressService from '../services/addressService';


export interface HousingFilters {
    individualOwner?: boolean;
    ageGt75?: boolean;
    multiOwner?: boolean;
    beneficiaryGt2?: boolean;
    ownerKind?: string;
    ownerAge?: string;
    beneficiaryCount?: number;
    housingKind?: string;
    housingState?: string;
}

const buildFilterByFormula = (housingFilters: HousingFilters, search: string) => {

    const allFilters = [
        housingFilters.individualOwner ? "{Type de propriétaire} = 'Particulier'" : '',
        housingFilters.ageGt75 ? '{Age (pour filtre)} >= 75' : '',
        housingFilters.multiOwner ? "{Multipropriétaire de logements vacants} = 'Multipropriétaire'" : '',
        housingFilters.beneficiaryGt2 ? "{Nombre d'ayants-droit} > 2" : '',
        housingFilters.ownerKind ? `TRIM({Type de propriétaire}) = '${housingFilters.ownerKind}'` : '',
        housingFilters.ownerAge === 'lt35' ? '{Age (pour filtre)} > 0' : '',
        housingFilters.ownerAge === 'lt35' ? '{Age (pour filtre)} <= 35' : '',
        housingFilters.ownerAge === '35to65' ? '{Age (pour filtre)} >= 35' : '',
        housingFilters.ownerAge === '35to65' ? '{Age (pour filtre)} <= 65' : '',
        housingFilters.ownerAge === 'gt65' ? '{Age (pour filtre)} >= 65' : '',
        housingFilters.ownerAge === 'gt75' ? '{Age (pour filtre)} >= 75' : '',
        housingFilters.beneficiaryCount ? `{Nombre d'ayants-droit} = ${housingFilters.beneficiaryCount}` : '',
        housingFilters.housingKind ? `TRIM({Type de logement}) = '${housingFilters.housingKind}'` : '',
        housingFilters.housingState ? `TRIM({Logement inconfortable (champ choix simple)}) = '${housingFilters.housingState}'` : '',
        search ? `FIND(LOWER("${search}"), LOWER({Adresse}&{Propriétaire}))` : ''
    ].filter(_ => _.length);

    return allFilters.length ? `AND(${allFilters.reduce((s1: string, s2: string) => `${s1}, ${s2}`)})` : '';

}

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List housing')

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    const filters = request.body.filters ?? {};
    const search = request.body.search;

    console.log('filterByFormula', buildFilterByFormula(filters, search))

    return base('🏡 Adresses').select({
        maxRecords: 500,
        fields: [
            'Adresse',
            'Nom de la commune du logement',
            'Propriétaire',
            'Age (pour filtre)',
            'ID propriétaire'
        ],
        filterByFormula: buildFilterByFormula(filters, search)
    })
        .all()
        .then((results: any) => {
            return response.status(200).json(results.map((result: any) => ({
                id: result.id,
                address: result.fields['Adresse'],
                municipality: result.fields['Nom de la commune du logement'],
                ownerFullName: result.fields['Propriétaire'],
                ownerId: result.fields['ID propriétaire'][0],
                tags: [result.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
            })));
        })
        .catch((_: any) => console.error(_));
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

    console.log('List housing by campaign', campaignId)

    return campaignHousingRepository.getHousingList(campaignId)
        .then((housingRefs: string[]) => {

            const Airtable = require('airtable');
            const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

            return base('🏡 Adresses').select({
                maxRecords: 500,
                fields: [
                    'Adresse',
                    'Nom de la commune du logement',
                    'Propriétaire',
                    'Age (pour filtre)',
                    'ID propriétaire'
                ],
                filterByFormula: `FIND({Record-ID=adresse}, ARRAYJOIN('${housingRefs}', ';')) > 0`
            })
                .all()
                .then((results: any) => {
                    return response.status(200).json(results.map((result: any) => ({
                        id: result.id,
                        address: result.fields['Adresse'],
                        municipality: result.fields['Nom de la commune du logement'],
                        ownerFullName: result.fields['Propriétaire'],
                        ownerId: result.fields['ID propriétaire'][0],
                        tags: [result.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
                    })));
                })
                .catch((_: any) => console.error(_));
        })

};


const exportByCampaign = async (request: Request, response: Response): Promise<Response> => {

    const campaignId = request.params.campaignId;

    console.log('Export housing by campaign', campaignId)

    const campaignApi = await campaignRepository.get(campaignId)
    const housingRefs = await campaignHousingRepository.getHousingList(campaignId)

    const fileName = `${campaignApi.name}.xlsx`;

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    const airtableResults = await base('🏡 Adresses').select({
        maxRecords: 500,
        fields: [
            'Adresse',
            'Nom de la commune du logement',
            'Civilité',
            'Propriétaire',
            'ADRESSE1',
            'ADRESSE2',
            'ADRESSE3',
            'ADRESSE4'
        ],
        filterByFormula: `FIND({Record-ID=adresse}, ARRAYJOIN('${housingRefs}', ';')) > 0`
    }).all()

    const ownerAdresses = await addressService.normalizeAdresses(
        airtableResults.map((result: any) => [result.fields['ADRESSE1'], result.fields['ADRESSE2'], result.fields['ADRESSE3'], result.fields['ADRESSE4']])
    )

    const housingAdresses = await addressService.normalizeAdresses(
        airtableResults.map((result: any) => [result.fields['Adresse'], result.fields['Nom de la commune du logement']])
    )

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Logements');

    worksheet.columns = [
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

    airtableResults.map((result: any, index: number) => {
        worksheet.addRow({
            civility: result.fields['Civilité'],
            owner: result.fields['Propriétaire'],
            ownerNumber: ownerAdresses[index].houseNumber,
            ownerStreet: ownerAdresses[index].street,
            ownerPostCode: ownerAdresses[index].postCode,
            ownerCity: ownerAdresses[index].city,
            housingNumber: housingAdresses[index].houseNumber,
            housingStreet: housingAdresses[index].street,
            housingPostCode: housingAdresses[index].postCode,
            housingCity: housingAdresses[index].city,
        });
    })

    worksheet.columns.forEach((column, index) => {
        const lengths = column.values?.filter(v => v !== undefined).map(v => v?.toString().length) ?? [10];
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

const housingController =  {
    list,
    listByOwner,
    listByCampaign,
    exportByCampaign
};

export default housingController;
