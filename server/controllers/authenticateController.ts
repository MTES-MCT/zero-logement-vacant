import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import { RequestUser } from '../models/UserApi';
import establishmentRepository from '../repositories/establishmentRepository';
import authTokenRepository from '../repositories/authTokenRepository';
import { addDays, isBefore } from 'date-fns';
import { Request as JWTRequest } from 'express-jwt';
import { constants } from 'http2';

const signin = async (request: Request, response: Response): Promise<Response> => {

    console.log('signin')

    const email = request.body.email;
    const password = request.body.password;

    try {
        const user = await userRepository.getByEmail(email)

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (isPasswordValid) {

            await userRepository.updateLastAuthentication(user.id)

            const establishmentId = user.establishmentId ?? request.body.establishmentId;
            const establishment = await establishmentRepository.get(establishmentId)

            if (establishment) {

                if (!config.auth.secret) {
                    return response.sendStatus(500)
                }

                return response.status(constants.HTTP_STATUS_OK).send({
                    user: {...user, password: undefined, establishmentId: undefined},
                    establishment,
                    accessToken: jwt.sign(<RequestUser>{ userId: user.id, establishmentId: establishment.id, role: user.role }, config.auth.secret, { expiresIn: config.auth.expiresIn })
                });
            }
            return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
        }
        console.log('Invalid password for email', email)
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)

    } catch {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    }
};

const activateAccount = async (request: Request, response: Response): Promise<Response> => {

    const email = request.body.email;
    const tokenId = request.body.tokenId;
    const password = request.body.password;

    console.log('activateAccount for token', tokenId)

    const authToken = await authTokenRepository.get(tokenId)

    if (!authToken || isBefore(authToken.createdAt, addDays(new Date(), -7))) {
        return response.sendStatus(498)
    }

    const user = await userRepository.get(authToken.userId)

    if (user.email !== email) {
        return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED)
    }

    return Promise.all([
        userRepository.updatePassword(authToken.userId, bcrypt.hashSync(password)),
        authTokenRepository.deleteToken(tokenId),
        userRepository.activate(authToken.userId)
    ])
        .then(() => response.sendStatus(constants.HTTP_STATUS_OK));
};

const updatePassword = async (request: JWTRequest, response: Response): Promise<Response> => {

    const userId = (<RequestUser>request.auth).userId;

    const currentPassword = request.body.currentPassword;
    const newPassword = request.body.newPassword;

    console.log('update password for ', userId)

    const user = await userRepository.get(userId)

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (isPasswordValid) {
        return userRepository.updatePassword(userId, bcrypt.hashSync(newPassword))
            .then(() => response.sendStatus(constants.HTTP_STATUS_OK))
    } else {
        return response.sendStatus(constants.HTTP_STATUS_FORBIDDEN)
    }
};


export default {
    signin,
    activateAccount,
    updatePassword
};
