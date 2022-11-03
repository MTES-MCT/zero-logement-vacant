import { NextFunction, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { RequestUser, UserApi, UserRoles } from '../models/UserApi';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';
import { body, param, ValidationChain } from 'express-validator';
import establishmentRepository from '../repositories/establishmentRepository';
import establishmentService from '../services/establishmentService';

const createUserValidators = [
    body('draftUser.email').isEmail(),
    body('draftUser.id').isEmpty(),
    body('draftUser.establishmentId').isUUID(),
    body('draftUser.firstName').isString(),
    body('draftUser.lastName').isString(),
];

const createUser = async (request: JWTRequest, response: Response, next: NextFunction) => {
    try {
        const draftUser = request.body.draftUser;
        const role = (<RequestUser>request.auth).role;

        const userApi = <UserApi> {
            email: draftUser.email,
            firstName: draftUser.firstName,
            lastName: draftUser.lastName,
            role: UserRoles.Usual,
            establishmentId: draftUser.establishmentId
        };

        console.log('Create user', userApi)

        if (role !== UserRoles.Admin) {
            return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
        }

        const userEstablishment = await establishmentRepository.get(draftUser.establishmentId)

        if (!userEstablishment) {
            return response.sendStatus(constants.HTTP_STATUS_NOT_FOUND)
        }

        const createdUser = await userRepository.insert(userApi);

        if (!userEstablishment.available) {
            await establishmentService.makeEstablishmentAvailable(userEstablishment)
        }

        return response.status(constants.HTTP_STATUS_OK).json(createdUser);

    } catch (error) {
        next(error);
    }
};

const list = async (request: JWTRequest, response: Response): Promise<Response> => {

    console.log('List users')

    const page = request.body.page;
    const perPage = request.body.perPage;
    const role = (<RequestUser>request.auth).role;
    const filters = <UserFiltersApi> request.body.filters ?? {};

    return role === UserRoles.Admin ?
        userRepository.listWithFilters(filters, page, perPage).then(_ => response.status(constants.HTTP_STATUS_OK).json(_)) :
            response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
};

const removeUser = async (request: JWTRequest, response: Response, next: NextFunction) => {
    try {
        console.log('Remove user')

        const role = (<RequestUser>request.auth).role;
        if (role !== UserRoles.Admin) {
            return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
        }

        const { userId } = request.params
        const user = await userRepository.get(userId);
        await userRepository.remove(user.id);

        response.sendStatus(constants.HTTP_STATUS_NO_CONTENT);
    } catch (error) {
        next(error);
    }
}

const userIdValidator: ValidationChain[] = [
  param('userId').isUUID()
];

const userController =  {
    createUserValidators,
    createUser,
    list,
    removeUser,
    userIdValidator
};

export default userController;
