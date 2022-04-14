import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import { RequestUser } from '../models/UserApi';
import establishmentRepository from '../repositories/establishmentRepository';
import localityRepository from '../repositories/localityRepository';
import authTokenRepository from '../repositories/authTokenRepository';
import { addDays, isBefore } from 'date-fns';

const signin = async (request: Request, response: Response): Promise<Response> => {

    console.log('signin')

    const email = request.body.email;
    const password = request.body.password;

    try {
        const user = await userRepository.getByEmail(email)

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (isPasswordValid) {

            const establishmentId = user.establishmentId ?? request.body.establishmentId;
            const establishment = await establishmentRepository.get(establishmentId)

            if (establishment) {

                const housingScopes = establishment.housingScopes.scopes ? establishment.housingScopes : await localityRepository.listHousingScopes(establishment.localities.map(_ => _.geoCode))

                return response.status(200).send({
                    user: {...user, password: undefined, establishmentId: undefined},
                    establishment: {...establishment, housingScopes},
                    accessToken: jwt.sign(<RequestUser>{ userId: user.id, establishmentId: establishment.id, role: user.role }, config.auth.secret, { expiresIn: 86400 })
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

const listAvailableEstablishments = async (request: Request, response: Response): Promise<Response> => {

    console.log('listAvailableEstablishments')

    return establishmentRepository.listAvailable()
             .then(_ => response.status(200).json(_));
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
        return response.sendStatus(403)
    }

    return Promise.all([
        userRepository.updatePassword(authToken.userId, bcrypt.hashSync(password)),
        authTokenRepository.deleteToken(tokenId)
    ])
        .then(() => response.sendStatus(200));
};


export default {
    signin,
    listAvailableEstablishments,
    activateAccount
};
