import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';
import { constants } from 'http2';

const listAvailableEstablishments = async (request: Request, response: Response): Promise<Response> => {

    console.log('list available establishments')

    return establishmentRepository.listAvailable()
             .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));
};

export default {
    listAvailableEstablishments
};
