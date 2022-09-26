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
import geoRepository from '../repositories/geoRepository';

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

                const geoPerimeterApis = await geoRepository.listGeoPerimeters(establishment.id)

                if (!config.auth.secret) {
                    return response.sendStatus(500)
                }

                return response.status(200).send({
                    user: {...user, password: undefined, establishmentId: undefined},
                    establishment: {...establishment, housingScopes: geoPerimeterApis.map(_ => _.type).filter((value, index, self) => self.indexOf(value) === index)},
                    accessToken: jwt.sign(<RequestUser>{ userId: user.id, establishmentId: establishment.id, role: user.role }, config.auth.secret, { expiresIn: config.auth.expiresIn })
                });
            }
            return response.sendStatus(401)
        }
        console.log('Invalid password for email', email)
        return response.sendStatus(401)

    } catch {
        return response.sendStatus(401)
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
        return response.sendStatus(401)
    }

    return Promise.all([
        userRepository.updatePassword(authToken.userId, bcrypt.hashSync(password)),
        authTokenRepository.deleteToken(tokenId),
        userRepository.activate(authToken.userId)
    ])
        .then(() => response.sendStatus(200));
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
            .then(() => response.sendStatus(200))
    } else {
        return response.sendStatus(403)
    }
};


export default {
    signin,
    activateAccount,
    updatePassword
};
