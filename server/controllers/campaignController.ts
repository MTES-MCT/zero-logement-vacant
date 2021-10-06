import config from '../utils/config';
import { Request, Response } from 'express';

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List campaigns')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('📊 Récap Campagnes').select({
        fields: [
            'Nom Campagne'
        ]
    })
        .all()
        .then((results: any) => {
            return response.status(200).json(results.map((result: any) => ({
                name: result.fields['Nom Campagne']
            })));
        })
        .catch((_: any) => console.error(_));
};

const campaignController =  {
    list
};

export default campaignController;
