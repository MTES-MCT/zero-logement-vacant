import { Request, Response } from 'express';
import { body, oneOf, validationResult } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';
import { OwnerApi } from '../models/OwnerApi';

const get = async (request: Request, response: Response): Promise<Response> => {

    const id = request.params.id;

    console.log('Get owner', id)

    return ownerRepository.get(id)
        .then(_ => response.status(200).json(_));
}

const update = async (request: Request, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }

    const ownerId = request.params.ownerId;

    console.log('Update owner', ownerId)

    const ownerApi = <OwnerApi>request.body.owner;

    return ownerRepository.update(ownerApi)
        .then(ownerApi => response.status(200).json(ownerApi));
}


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
