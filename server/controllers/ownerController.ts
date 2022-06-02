import { Request, Response } from 'express';
import { body, oneOf, validationResult } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';
import { HousingOwnerApi, OwnerApi } from '../models/OwnerApi';

const get = async (request: Request, response: Response): Promise<Response> => {

    const id = request.params.id;

    console.log('Get owner', id)

    return ownerRepository.get(id)
        .then(_ => response.status(200).json(_));
}

const search = async (request: Request, response: Response): Promise<Response> => {

    const q = request.body.q;
    const page = request.body.page;
    const perPage = request.body.perPage;

    console.log('Search owner', q)

    return ownerRepository.searchOwners(q, page, perPage)
        .then(_ => response.status(200).json(_));
}

const listByHousing = async (request: Request, response: Response): Promise<Response> => {

    const housingId = request.params.housingId;

    console.log('List owner for housing', housingId)

    return ownerRepository.listByHousing(housingId)
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

const updateHousingOwners = async (request: Request, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({ errors: errors.array() });
    }

    const housingId = request.params.housingId;

    console.log('Update housing owners', housingId)

    const housingOwnersApi = (<HousingOwnerApi[]>request.body.housingOwners).filter(_ => _.housingId === housingId);

    return ownerRepository.deleteHousingOwners(housingId, housingOwnersApi.map(_ => _.id))
        .then(_ => ownerRepository.insertHousingOwners(housingOwnersApi))
        .then(_ => response.status(200).json(_));
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
    search,
    update,
    ownerValidators,
    listByHousing,
    updateHousingOwners
};

export default ownerController;
