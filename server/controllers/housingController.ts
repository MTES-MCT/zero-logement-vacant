import config from '../utils/config';

const get = async (request, response): Promise<void> => {

    console.log('Get housing')

    let Airtable = require('airtable');
    let base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    base('🏡 Adresses').select({
        // Selecting the first 3 records in Vue générale:
        maxRecords: 10,
        view: "Vue générale"
    }).all().then(r => {
        return response.status(200).json(r);
    });
};

export default {
    get,
};
