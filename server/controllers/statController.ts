import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import establishmentRepository from '../repositories/establishmentRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';


const establishmentCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get available establishment count')

    return establishmentRepository.listAvailable()
        .then(_ => response.status(200).json(_.length));
};

const housingContactedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get contacted housing count')

    return housingRepository.countWithFilters({campaignsCounts: ['current']})
        .then(_ => response.status(200).json(_));
};

const housingWaitingCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get waiting housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.Waiting]})
        .then(_ => response.status(200).json(_));
};

const answersCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get answers count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.FirstContact, HousingStatusApi.InProgress, HousingStatusApi.NotVacant, HousingStatusApi.NoAction, HousingStatusApi.Exit]})
        .then(_ => response.status(200).json(_));
};

const housingFirstContactedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get first contacted housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.FirstContact]})
        .then(_ => response.status(200).json(_));
};

const housingFollowedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get followed housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.InProgress]})
        .then(_ => response.status(200).json(_));
};


const housingOutOfVacancyCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get supported housing count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.Exit]})
        .then(_ => response.status(200).json(
            _.entities
                .filter(housing => housing.subStatus?.length ).length
            )
        );
};

const statController =  {
    establishmentCount,
    housingContactedCount,
    housingWaitingCount,
    answersCount,
    housingFirstContactedCount,
    housingFollowedCount,
    housingOutOfVacancyCount
};

export default statController;
