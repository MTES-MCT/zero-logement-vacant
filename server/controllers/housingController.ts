import config from '../utils/config';
import { Request, Response } from 'express';

const get = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('🏡 Adresses').select({
        // Selecting the first 3 records in Vue générale:
        maxRecords: 10,
        view: "Vue générale",
        filterByFormula: "{Taxation du logement sur la vacance (THLV ou TLV)} = 'oui'"
    }).firstPage().then((_: any) => {
        return response.status(200).json(_);
    });
};

export default {
    get,
};
