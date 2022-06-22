import { Request, Response } from 'express';
import housingRepository from '../repositories/housingRepository';
import establishmentRepository from '../repositories/establishmentRepository';
import {
    HousingStatusApi,
    InProgressWithoutSupportSubStatus,
    FirstContactWithPreSupportSubStatus,
    InProgressWithSupportSubStatus,
    ExitWithSupportSubStatus,
    ExitWithPublicSupportSubStatus,
    ExitWithoutSupportSubStatus,
} from '../models/HousingStatusApi';


const establishmentCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get available establishment count')

    return establishmentRepository.listAvailable()
        .then(_ => response.status(200).json(_.length));
};

const housingContactedCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get contacted housing count')

    return housingRepository.countWithFilters({status: [HousingStatusApi.Waiting, HousingStatusApi.FirstContact, HousingStatusApi.InProgress, HousingStatusApi.NotVacant, HousingStatusApi.NoAction, HousingStatusApi.Exit]})
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

const housingInProgressWithSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing in progress with support count')

    return Promise.all([
        housingRepository.listWithFilters({status: [HousingStatusApi.FirstContact], subStatus: [FirstContactWithPreSupportSubStatus]}),
        housingRepository.listWithFilters({status: [HousingStatusApi.InProgress], subStatus: [InProgressWithSupportSubStatus]}),
    ])
        .then(([result1, result2]) =>
            response.status(200).json(result1.entities.length + result2.entities.length)
        );
};

const housingInProgressWithoutSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing in progress without support count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.InProgress], subStatus: [InProgressWithoutSupportSubStatus]})
        .then(_ => response.status(200).json(_.entities.length))
};

const housingExitWithSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing out of vacancy with support count')

    return Promise.all([
        housingRepository.listWithFilters({status: [HousingStatusApi.Exit], subStatus: [ExitWithSupportSubStatus]}),
        housingRepository.listWithFilters({status: [HousingStatusApi.Exit], subStatus: [ExitWithPublicSupportSubStatus]}),
    ])
        .then(([result1, result2]) =>
            response.status(200).json(result1.entities.length + result2.entities.length)
        );
};

const housingExitWithoutSupportCount = async (request: Request, response: Response): Promise<Response> => {

    console.log('Get housing out of vacancy without support count')

    return housingRepository.listWithFilters({status: [HousingStatusApi.Exit], subStatus: [ExitWithoutSupportSubStatus]})
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
    housingInProgressWithSupportCount,
    housingInProgressWithoutSupportCount,
    housingExitWithSupportCount,
    housingExitWithoutSupportCount
};

export default statController;
