import config from '../utils/config';
import { Request, Response } from 'express';

const get = async (request: Request, response: Response): Promise<Response> => {

    const id = request.params.id;

    console.log('Get owner', id)

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('🏡 Adresses').select({
        fields: [
            'Propriétaire',
            'Adresse mail',
            'Numéro de téléphone',
            'ADRESSE1',
            'ADRESSE2',
            'ADRESSE3',
            'ADRESSE4',
            'Année naissance'
        ],
        filterByFormula: `{Record-ID=proprietaire} = '${id}'`
    })
        .all()
        .then((a: any) => {
            return response.status(200).json({
                address: [
                    a[0].fields['ADRESSE1'],
                    a[0].fields['ADRESSE2'],
                    a[0].fields['ADRESSE3'],
                    a[0].fields['ADRESSE4']
                ].filter(a => a !== undefined),
                fullName: a[0].fields['Propriétaire'],
                birthDate: a[0].fields['Année naissance'],
                email: a.map((_: any) => _.fields['Adresse mail']).filter((_: any) => _ !== undefined)[0],
                phone: a.map((_: any) => _.fields['Numéro de téléphone']).filter((_: any) => _ !== undefined)[0],
            });
        })
        .catch((_: any) => console.error(_));
};

const ownerController =  {
    get
};

export default ownerController;
