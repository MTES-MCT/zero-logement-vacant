import config from '../utils/config';
import { Request, Response } from 'express';
import { OwnerApi } from '../models/OwnerApi';
import { body, validationResult } from 'express-validator';
import { format, parseISO } from 'date-fns';

const get = async (request: Request, response: Response): Promise<Response> => {

    const id = request.params.id;

    console.log('Get owner', id)

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('🏡 Adresses').select({
        fields: [
            'ID propriétaire',
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
            return response.status(200).json(<OwnerApi>{
                id: a[0].fields['ID propriétaire'][0],
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

const update = async (request: Request, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }

    const ownerId = request.params.ownerId;

    console.log('Update owner', ownerId)

    const ownerApi = <OwnerApi>request.body.owner;

    const Airtable = require('airtable');
    const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);

    return base('🏡 Adresses').select({
        fields: [
            'Record-ID=adresse'
        ],
        filterByFormula: `{Record-ID=proprietaire} = '${ownerId}'`
    })
        .all()
        .then((results: any) => {
            return Promise.all(
                results.map((result: any) => {
                    return base('🏡 Adresses').update([{
                        id: result.fields['Record-ID=adresse'],
                        fields: {
                            'ADRESSE1': ownerApi.address[0] ?? '',
                            'ADRESSE2': ownerApi.address[1] ?? '',
                            'ADRESSE3': ownerApi.address[2] ?? '',
                            'Adresse mail': ownerApi.email,
                            'Numéro de téléphone': ownerApi.phone ?? '',
                            'Année naissance': ownerApi.birthDate ? format(parseISO(ownerApi.birthDate), 'yyyy') : undefined
                        }
                    }])
                })
            )
        })
        .then(() => {
            return response.status(200).json('ok')
        })
        .catch((err: any) => console.error("Error", err));
};


const ownerValidators = [
    body('owner.email').isEmail()
];


const ownerController =  {
    get,
    update,
    ownerValidators
};

export default ownerController;
