import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';

const listAvailableEstablishments = async (request: Request, response: Response): Promise<Response> => {

    console.log('list available establishments')

    return establishmentRepository.listAvailable()
             .then(_ => response.status(200).json(_));
};

export default {
    listAvailableEstablishments
};
