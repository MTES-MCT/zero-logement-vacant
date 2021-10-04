import config from '../utils/config';
import { Request, Response } from 'express';

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
    }).all().then((_: any) => {
        return response.status(200).json(_);
    });
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
    }).all().then((_: any) => {
        return response.status(200).json(_);
    });
};

const housingController =  {
    list,
    listByOwner
};

export default housingController;
