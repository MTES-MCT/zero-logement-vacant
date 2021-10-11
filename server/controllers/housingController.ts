import config from '../utils/config';
import { Request, Response } from 'express';
import campaignHousingRepository from '../repositories/campaignHousingRepository';

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

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

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
                ownerId: result.fields['ID propriétaire'],
                tags: [result.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
            })));
        })
        .catch((_: any) => console.error(_));
};

const listByOwner = async (request: Request, response: Response): Promise<Response> => {

    const ownerId = request.params.ownerId;

    console.log('List housing by owner', ownerId)

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

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

            let Airtable = require('airtable');
            let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

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
                        ownerId: result.fields['ID propriétaire'],
                        tags: [result.fields['Age (pour filtre)'] ?? 0 > 75 ? '> 75 ans' : ''].filter(_ => _.length)
                    })));
                })
                .catch((_: any) => console.error(_));
        })

};

const housingController =  {
    list,
    listByOwner,
    listByCampaign
};

export default housingController;
