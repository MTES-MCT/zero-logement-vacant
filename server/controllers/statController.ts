import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';

const contactedOwnersCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get contacted owners count')

    return housingRepository.countWithFilters({campaignsCounts: ['1']})
        .then(_ => response.status(200).json(_));
};

const statController =  {
    contactedOwnersCount
};

export default statController;
