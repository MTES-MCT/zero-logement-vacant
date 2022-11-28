import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import { RequestUser } from '../models/UserApi';
import establishmentRepository from '../repositories/establishmentRepository';
import { Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';
import { param, ValidationChain } from 'express-validator';
import ceremaService from '../services/ceremaService';
import prospectRepository from '../repositories/prospectRepository';
import { TEST_ACCOUNTS } from '../models/ProspectApi';

const signin = async (request: Request, response: Response): Promise<Response> => {

    console.log('signin')

    const email = request.body.email;
    const password = request.body.password;

    try {
        const user = await userRepository.getByEmail(email)

        if (!user) {
            console.log('Invalid user for email', email)
            return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            console.log('Invalid password for email', email)
            return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
        }

        await userRepository.updateLastAuthentication(user.id)

        const establishmentId = user.establishmentId ?? request.body.establishmentId;
        const establishment = await establishmentRepository.get(establishmentId)

        if (!establishment) {
            console.log('Invalid establishment for id', establishmentId)
            return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
        }

        return response.status(constants.HTTP_STATUS_OK).send({
            user: {...user, password: undefined, establishmentId: undefined},
            establishment,
            accessToken: jwt.sign(<RequestUser>{ userId: user.id, establishmentId: establishment.id, role: user.role }, config.auth.secret, { expiresIn: config.auth.expiresIn })
        });

    } catch {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    }
};

const getAccountValidator: ValidationChain[] = [
    param('email').notEmpty().isEmail()
];

const getProspectAccount = async (request: Request, response: Response) => {
    const email = request.params.email as string;
    console.log('Get account', email)

    if (config.features.enableTestAccounts) {
        const testAccount = TEST_ACCOUNTS.find(account => account.email === email)
        if (testAccount) {
            return response.status(constants.HTTP_STATUS_OK).json(testAccount)
        }
    }

    const user = await userRepository.getByEmail(email)

    if (user) {
        console.log('Prospect is already a user for email', email)
        return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
    }

    const ceremaUser = await ceremaService.consultUser(email)
    await prospectRepository.upsert(ceremaUser)

    const prospect = await prospectRepository.get(email)

    return response.status(constants.HTTP_STATUS_OK).json(prospect);
};

const updatePassword = async (request: JWTRequest, response: Response): Promise<Response> => {

    const userId = (<RequestUser>request.auth).userId;

    const currentPassword = request.body.currentPassword;
    const newPassword = request.body.newPassword;

    console.log('update password for ', userId)

    const user = await userRepository.get(userId)

    if (!user) {
        console.log('Invalid user for id', userId)
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (isPasswordValid) {
        // TODO: avoid hashing password synchronously
        // as it blocks other incoming requests
        return userRepository.updatePassword(userId, bcrypt.hashSync(newPassword))
            .then(() => response.sendStatus(constants.HTTP_STATUS_OK))
    } else {
        return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN)
    }
};


export default {
    signin,
    getAccountValidator,
    getProspectAccount,
    updatePassword
};
