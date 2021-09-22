import config from '../utils/config';
import { Request, Response } from 'express';

const get = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    const ownerKinds = request.body.ownerKinds;

    const ownerKindsFormula = ownerKinds ? `OR(${ownerKinds
        .map((ownerKind: string) => `{Type de propriétaire} = '${ownerKind}'`)
        .reduce((s1: string, s2: string) => `${s1}, ${s2}`)})` : '';

    const ownerKindsFormula1 = "{Type de propriétaire} = 'SCI'"

    console.log('ownerKindsFormula', ownerKindsFormula)
    console.log('ownerKindsFormula', ownerKindsFormula1)

    return base('🏡 Adresses').select({
        // Selecting the first 3 records in Vue générale:
        maxRecords: 10,
        view: "Vue générale",
        filterByFormula : ownerKindsFormula
    }).firstPage().then((_: any) => {
        return response.status(200).json(_);
    });
};

export default {
    get,
};
