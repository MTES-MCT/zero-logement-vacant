import config from '../utils/config';
import { Request, Response } from 'express';

export enum HousingFilters {
    IndividualOwner = 'IndividualOwner', Age75= 'Age75', MultiOwner = 'MultiOwner', Beneficiary2= 'Beneficiary2'
}

const buildFilterByFormula = (housingFilters: HousingFilters[], search: string) => {

    const allFilters = [
        ... housingFilters.map(filter => {
            switch (filter) {
                case HousingFilters.IndividualOwner:
                    return "{Type de propriétaire} = 'Particulier'"
                case HousingFilters.Age75:
                    return '{Age (pour filtre)} > 75'
                case HousingFilters.MultiOwner:
                    return "{Multipropriétaire de logements vacants} = 'Multipropriétaire'"
                case HousingFilters.Beneficiary2:
                    return "{Nombre d'ayants-droit} > 2"
                default:
                    return '' as string;
            }
        }),
        ...(search ? [`FIND(LOWER("${search}"), LOWER({ADRESSE1}&{ADRESSE2}&{ADRESSE3}&{ADRESSE4}&{Propriétaire}))`] : [])
    ];

    return allFilters.length ? `AND(${allFilters.reduce((s1: string, s2: string) => `${s1}, ${s2}`)})` : '';

}

const get = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    const filters = request.body.filters ?? [];
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
