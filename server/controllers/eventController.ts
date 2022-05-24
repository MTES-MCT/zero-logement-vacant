import { Request, Response } from 'express';
import eventRepository from '../repositories/eventRepository';
import { EventApi } from '../models/EventApi';
import { RequestUser } from '../models/UserApi';
import { Request as JWTRequest } from 'express-jwt';

const create = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('Create event')

    const userId = (<RequestUser>request.auth).userId;

    const event = request.body.event;

    return eventRepository.insert(<EventApi>{...event, createdBy: userId})
        .then(_ => response.status(200).json(_));

}

const listByOwnerId = async (request: Request, response: Response): Promise<Response> => {

    const ownerId = request.params.ownerId;

    console.log('List events for owner', ownerId)

    return eventRepository.listByOwnerId(ownerId)
        .then(_ => response.status(200).json(_));

}

const listByHousingId = async (request: Request, response: Response): Promise<Response> => {

    const housingId = request.params.housingId;

    console.log('List events for housing', housingId)

    return eventRepository.listByHousingId(housingId)
        .then(_ => response.status(200).json(_));

}

const eventController =  {
    create,
    listByOwnerId,
    listByHousingId
};

export default eventController;
