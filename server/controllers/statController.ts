import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import establishmentRepository from '../repositories/establishmentRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';

const contactedOwnersCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get contacted owners count')

    return housingRepository.countWithFilters({campaignsCounts: ['1']})
        .then(_ => response.status(200).json(_));
};

const establishmentCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get available establishment count')

    return establishmentRepository.listAvailable()
        .then(_ => response.status(200).json(_.length));
};

const answersCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get answers count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.FirstContact, HousingStatusApi.InProgress, HousingStatusApi.NotVacant, HousingStatusApi.NoAction, HousingStatusApi.Exit]})
        .then(_ => response.status(200).json(_));
};

const housingFollowedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get followed housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.FirstContact, HousingStatusApi.InProgress]})
        .then(_ => response.status(200).json(_));
};

const housingSupportedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get supported housing count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.FirstContact, HousingStatusApi.InProgress]})
        .then(_ => response.status(200).json(
            _.entities
                .filter(housing =>
                    housing.status === HousingStatusApi.InProgress || (housing.status === HousingStatusApi.FirstContact && housing.subStatus === 'En pré-accompagnement')
                ).length
            )
        );
};

const housingOutOfVacancyCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get supported housing count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.Exit]})
        .then(_ => response.status(200).json(
            _.entities
                .filter(housing => housing.subStatus === 'Via accompagnement' || housing.subStatus === 'Sans accompagnement').length
            )
        );
};

const statController =  {
    contactedOwnersCount,
    establishmentCount,
    answersCount,
    housingFollowedCount,
    housingSupportedCount,
    housingOutOfVacancyCount
};

export default statController;
