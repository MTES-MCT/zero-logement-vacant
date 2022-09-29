import { Request, Response } from 'express';
import { body, oneOf, validationResult } from 'express-validator';
import ownerRepository from '../repositories/ownerRepository';
import { DraftOwnerApi, HousingOwnerApi, OwnerApi } from '../models/OwnerApi';
import eventRepository from '../repositories/eventRepository';
import { RequestUser } from '../models/UserApi';
import { Request as JWTRequest } from 'express-jwt';
import { EventApi, EventKinds } from '../models/EventApi';
import addressService from '../services/addressService';
import { constants } from 'http2';

const get = async (request: Request, response: Response): Promise<Response> => {

    const id = request.params.id;

    console.log('Get owner', id)

    return ownerRepository.get(id)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));
}

const search = async (request: Request, response: Response): Promise<Response> => {

    const q = request.body.q;
    const page = request.body.page;
    const perPage = request.body.perPage;

    console.log('Search owner', q)

    return ownerRepository.searchOwners(q, page, perPage)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));
}

const listByHousing = async (request: Request, response: Response): Promise<Response> => {

    const housingId = request.params.housingId;

    console.log('List owner for housing', housingId)

    return ownerRepository.listByHousing(housingId)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));
}

const create = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    console.log('Create owner')

    const userId = (<RequestUser>request.auth).userId;
    const draftOwnerApi = <DraftOwnerApi>request.body.draftOwner;

    const createdOwnerApi =await ownerRepository.insert(draftOwnerApi)

    const ownerAdresses = await addressService.normalizeAddresses(
        [{
            addressId: createdOwnerApi.id,
            rawAddress: createdOwnerApi.rawAddress
        }])

    await ownerRepository.updateAddressList(ownerAdresses)

    return eventRepository.insert(<EventApi>{
        ownerId: createdOwnerApi.id,
        kind: EventKinds.OwnerCreation,
        content: 'Création du propriétaire',
        createdBy: userId
    })
        .then(() => response.status(constants.HTTP_STATUS_OK).json(createdOwnerApi));
}

const update = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const ownerId = request.params.ownerId;

    console.log('Update owner', ownerId)

    const userId = (<RequestUser>request.auth).userId;
    const ownerApi = <OwnerApi>request.body.owner;

    const updatedOwnerApi = await ownerRepository.update(ownerApi);

    const ownerAdresses = await addressService.normalizeAddresses(
        [{
            addressId: updatedOwnerApi.id,
            rawAddress: updatedOwnerApi.rawAddress
        }])

    await ownerRepository.updateAddressList(ownerAdresses)

    return eventRepository.insert(<EventApi>{
            ownerId: updatedOwnerApi.id,
            kind: EventKinds.OwnerUpdate,
            content: 'Modification des données d\'identité',
            createdBy: userId
        })
        .then(() => response.status(constants.HTTP_STATUS_OK).json(updatedOwnerApi));
}

const updateHousingOwners = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

    const housingId = request.params.housingId;

    console.log('Update housing owners', housingId)

    const userId = (<RequestUser>request.auth).userId;
    const housingOwnersApi = (<HousingOwnerApi[]>request.body.housingOwners).filter(_ => _.housingId === housingId);

    const prevHousingOwnersApi = await ownerRepository.listByHousing(housingId)

    if (prevHousingOwnersApi.length !== housingOwnersApi.length || prevHousingOwnersApi.find(ho1 => !housingOwnersApi.find(ho2 => ho1.id === ho2.id && ho1.rank === ho2.rank))) {

        return ownerRepository.deleteHousingOwners(housingId, housingOwnersApi.map(_ => _.id))
            .then(() => ownerRepository.insertHousingOwners(housingOwnersApi))
            .then(() => eventRepository.insert(<EventApi>{
                housingId,
                kind: EventKinds.HousingOwnersUpdate,
                content: `Modification des propriétaires 
                            <br/> ${prevHousingOwnersApi.length === 1 ? ' Propriétaire précédent : ' : ' Propriétaires précédents : '} 
                            ${prevHousingOwnersApi.map(_ => `${_.fullName} (${_.rank === 0 ? 'Ancien' : _.rank === 1 ? 'Principal' : _.rank+'ème ayant droit'})`).join(' - ')}`,
                createdBy: userId
            }))
            .then(() => response.sendStatus(constants.HTTP_STATUS_OK));

    } else {
        return response.sendStatus(304)
    }
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
    create,
    update,
    ownerValidators,
    listByHousing,
    updateHousingOwners
};

export default ownerController;
