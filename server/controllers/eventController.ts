import { Request, Response } from 'express';
import eventRepository from '../repositories/eventRepository';
import { EventApi } from '../models/EventApi';
import { RequestUser } from '../models/UserApi';

const create = async (request: Request, response: Response): Promise<Response> => {

    console.log('Create event')

    const userId = (<RequestUser>request.user).userId;

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

const eventController =  {
    create,
    listByOwnerId
};

export default eventController;
