import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import { RequestUser } from '../models/UserApi';
import establishmentRepository from '../repositories/establishmentRepository';

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
                return response.status(200).send({
                    user: {...user, password: undefined, establishmentId: undefined},
                    establishment,
                    accessToken: jwt.sign(<RequestUser>{ userId: user.id, establishmentId: establishment.id }, config.auth.secret, { expiresIn: 86400 })
                });
            }
            return response.sendStatus(401)
        }
        console.error('Invalid password for email', email)
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

export default {
    signin,
    listAvailableEstablishments
};
