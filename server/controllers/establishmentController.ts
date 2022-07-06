import { Request, Response } from 'express';
import establishmentRepository from '../repositories/establishmentRepository';
import { Request as JWTRequest } from 'express-jwt';
import { RequestUser, UserRoles } from '../models/UserApi';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';

const listAvailableEstablishments = async (request: Request, response: Response): Promise<Response> => {

    console.log('list available establishments')

    return establishmentRepository.listAvailable()
             .then(_ => response.status(200).json(_));
};

const listEstablishmentData = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('list establishment data')

    const role = (<RequestUser>request.auth).role;
    const establishmentId = (<RequestUser>request.auth).userId;

    const filters = <MonitoringFiltersApi> request.body.filters ?? {};

    return establishmentRepository.listDataWithFilters({...filters, establishmentIds: role === UserRoles.Admin ? filters.establishmentIds : [establishmentId] })
             .then(_ => response.status(200).json(_));
};

export default {
    listAvailableEstablishments,
    listEstablishmentData
};
