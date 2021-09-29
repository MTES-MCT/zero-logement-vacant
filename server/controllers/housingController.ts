import config from '../utils/config';
import { Request, Response } from 'express';

export interface HousingFilters {
    individualOwner?: boolean;
    age75?: boolean;
    multiOwner?: boolean;
    beneficiary2?: boolean;
    housingKind?: string;
}

const buildFilterByFormula = (housingFilters: HousingFilters, search: string) => {

    const allFilters = [
        housingFilters.individualOwner ? "{Type de propriétaire} = 'Particulier'" : '',
        housingFilters.age75 ? '{Age (pour filtre)} > 75' : '',
        housingFilters.multiOwner ? "{Multipropriétaire de logements vacants} = 'Multipropriétaire'" : '',
        housingFilters.beneficiary2 ? "{Nombre d'ayants-droit} > 2" : '',
        housingFilters.housingKind ? `TRIM({Type de logement}) = '${housingFilters.housingKind}'` : '',
        search ? `FIND(LOWER("${search}"), LOWER({ADRESSE1}&{ADRESSE2}&{ADRESSE3}&{ADRESSE4}&{Propriétaire}))` : ''
    ].filter(_ => _.length);

    return allFilters.length ? `AND(${allFilters.reduce((s1: string, s2: string) => `${s1}, ${s2}`)})` : '';

}

const get = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    const filters = request.body.filters ?? {};
    const search = request.body.search;

    console.log('filterByFormula', buildFilterByFormula(filters, search))

    return base('🏡 Adresses').select({
        maxRecords: 500,
        fields: [
            'ADRESSE1',
            'ADRESSE2',
            'ADRESSE3',
            'ADRESSE4',
            'Propriétaire',
            'Age (pour filtre)'
        ],
        view: "Vue générale",
        filterByFormula: buildFilterByFormula(filters, search)
    }).all().then((_: any) => {
        return response.status(200).json(_);
    });
};

const housingController =  {
    get,
    buildFilterByFormula
};

export default housingController;
