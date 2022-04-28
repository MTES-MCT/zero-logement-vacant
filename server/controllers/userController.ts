import { Request, Response } from 'express';
import userRepository from '../repositories/userRepository';
import { RequestUser, UserRoles } from '../models/UserApi';
import authTokenRepository from '../repositories/authTokenRepository';
import mailService, { ActivationMail } from '../services/mailService';
import { UserFiltersApi } from '../models/UserFiltersApi';

const createUser = async (request: Request, response: Response): Promise<Response> => {

    console.log('Create user')

    const userApi = request.body.draftUser;

    return userRepository.insert(userApi)
        .then(_ => response.status(200).json(_));
};

const list = async (request: Request, response: Response): Promise<Response> => {

    console.log('List users')

    const page = request.body.page;
    const perPage = request.body.perPage;
    const role = (<RequestUser>request.user).role;
    const filters = <UserFiltersApi> request.body.filters ?? {};

    return role === UserRoles.Admin ?
        userRepository.listWithFilters(filters, page, perPage).then(_ => response.status(200).json(_)) :
            response.sendStatus(401);
};


const sendActivationEmail = async (request: Request, response: Response): Promise<Response> => {

    const userId = request.params.userId;

    console.log('sendAuthToken to ', userId)

    const authToken = await authTokenRepository.upsertUserToken(userId)

    const user = await userRepository.get(userId)

    return mailService.sendMail('ZLV - Activation de votre compte', ActivationMail(authToken.id), [user.email])
        .then(() => response.status(200).json(user));
};

const userController =  {
    createUser,
    list,
    sendActivationEmail
};

export default userController;
