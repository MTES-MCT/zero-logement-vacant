import { Request, Response } from 'express';
import eventRepository from '../repositories/eventRepository';

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
    listByOwnerId,
    listByHousingId
};

export default eventController;
