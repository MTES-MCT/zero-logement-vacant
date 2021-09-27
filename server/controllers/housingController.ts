import config from '../utils/config';
import { Request, Response } from 'express';

const get = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    const ownerKinds = request.body.ownerKinds ?? [];
    const multiOwner = request.body.multiOwner;
    const age75 = request.body.age75;

    const multiOwnerFormula = multiOwner ? "{Multipropriétaire de logements vacants} = 'Multipropriétaire'" : '';
    const ageFormula = age75 ? "{Age (pour filtre)} > 75" : '';
    const formulas = [
        ...ownerKinds.map((ownerKind: string) => `{Type de propriétaire} = '${ownerKind}'`),
        multiOwnerFormula,
        ageFormula
    ].filter((_: string) => _.length);

    const filterByFormula = formulas.length ? `OR(${formulas
        .reduce((s1: string, s2: string) => `${s1}, ${s2}`)})` : '';


    console.log('filterByFormula', filterByFormula)

    return base('🏡 Adresses').select({
        maxRecords: 500,
        fields: [
            'ADRESSE1',
            'ADRESSE2',
            'ADRESSE3',
            'ADRESSE4',
            'Propriétaire'
        ],
        view: "Vue générale",
        filterByFormula
    }).all().then((_: any) => {
        return response.status(200).json(_);
    });
};

export default {
    get,
};
