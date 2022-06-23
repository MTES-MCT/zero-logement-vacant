import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';
import { Request as JWTRequest } from 'express-jwt';

const listAvailableEstablishments = async (request: Request, response: Response): Promise<Response> => {

    console.log('list available establishments')

    return establishmentRepository.listAvailable()
             .then(_ => response.status(200).json(_));
};

const listEstablishmentData = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('list establishment data')

    return establishmentRepository.listData()
             .then(_ => response.status(200).json(_));
};

export default {
    listAvailableEstablishments,
    listEstablishmentData
};
