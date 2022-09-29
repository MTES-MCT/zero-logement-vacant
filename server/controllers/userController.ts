import { Request, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { RequestUser, UserApi, UserRoles } from '../models/UserApi';
import authTokenRepository from '../repositories/authTokenRepository';
import mailService, { ActivationMail } from '../services/mailService';
import { UserFiltersApi } from '../models/UserFiltersApi';
import { Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';
import { body, validationResult } from 'express-validator';

const createUserValidators = [
    body('draftUser.email').isEmail(),
    body('draftUser.id').isEmpty(),
    body('draftUser.establishmentId').isUUID(),
    body('draftUser.firstName').isString(),
    body('draftUser.lastName').isString(),
];

const createUser = async (request: JWTRequest, response: Response): Promise<Response> => {

    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({ errors: errors.array() });
    }

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

    return userRepository.insert(userApi)
        .then(_ => response.status(constants.HTTP_STATUS_OK).json(_));
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


const sendActivationEmail = async (request: Request, response: Response): Promise<Response> => {

    const userId = request.params.userId;

    console.log('sendAuthToken to ', userId)

    const authToken = await authTokenRepository.upsertUserToken(userId)

    const user = await userRepository.get(userId)

    return mailService.sendMail('ZLV - Activation de votre compte', ActivationMail(authToken.id), [user.email])
        .then(() => response.status(constants.HTTP_STATUS_OK).json(user));
};

const userController =  {
    createUserValidators,
    createUser,
    list,
    sendActivationEmail
};

export default userController;
