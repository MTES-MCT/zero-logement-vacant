import { Request, Response } from 'express';
import { body, oneOf } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';

const get = async (request: Request, response: Response): Promise<Response> => {

    const id = request.params.id;

    console.log('Get owner', id)

    return ownerRepository.get(id)
        .then(_ => response.status(200).json(_));
};

const update = async (request: Request, response: Response): Promise<Response> => {

    // const errors = validationResult(request);
    // if (!errors.isEmpty()) {
    //     return response.status(400).json({ errors: errors.array() });
    // }
    //
    // const ownerId = request.params.ownerId;
    //
    // console.log('Update owner', ownerId)
    //
    // const ownerApi = <OwnerApi>request.body.owner;
    //
    // const Airtable = require('airtable');
    // const base = new Airtable({apiKey: config.airTable.apiKey}).base(config.airTable.base);
    //
    // return base('🏡 Adresses').select({
    //     fields: [
    //         'Record-ID=adresse'
    //     ],
    //     filterByFormula: `{Record-ID=proprietaire} = '${ownerId}'`
    // })
    //     .all()
    //     .then((results: any) => {
    //         return Promise.all(
    //             results.map((result: any) => {
    //                 return base('🏡 Adresses').update([{
    //                     id: result.fields['Record-ID=adresse'],
    //                     fields: {
    //                         'ADRESSE1': ownerApi.address[0] ?? '',
    //                         'ADRESSE2': (ownerApi.address[3] || ownerApi.address[2]) ? ownerApi.address[1] ?? '' : '',
    //                         'ADRESSE3': ownerApi.address[3] ? ownerApi.address[2] ?? '' : '',
    //                         'ADRESSE4': ownerApi.address[3] ?? ownerApi.address[2] ?? ownerApi.address[1] ?? '',
    //                         'Adresse mail': ownerApi.email,
    //                         'Numéro de téléphone': ownerApi.phone ?? '',
    //                         'Année naissance': ownerApi.birthDate ? format(parseISO(ownerApi.birthDate), 'yyyy') : null
    //                     }
    //                 }])
    //             })
    //         )
    //     })
    //     .then(() => {
    //         return response.status(200).json('ok')
    //     })
    //     .catch((err: any) => console.error("Error", err));

    return response.status(200).json('ok')
};


const ownerValidators = [

    oneOf(
    [
        body('owner.email').isEmpty(),
        body('owner.email').isEmail()
        ]
    )
];


const ownerController =  {
    get,
    update,
    ownerValidators
};

export default ownerController;
