import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository';
import { RequestUser } from '../models/UserApi';

const signin = async (request: Request, response: Response): Promise<Response> => {

    console.log('signin')

    const email = request.body.email;
    const password = request.body.password;

    const user = await userRepository.getByEmail(email)

    return bcrypt.compare(password, user.password)
        .then(isPasswordValid => {
            if (!isPasswordValid) {
                return response.status(401).send({ accessToken: null });
            } else {
                return response.status(200).send({
                    user: {...user, password: undefined},
                    accessToken: jwt.sign(<RequestUser>{ userId: user.id, establishmentId: user.establishment.id }, config.auth.secret, { expiresIn: 86400 })
              });
            }
        })
        .catch(() => response.status(401).send({ accessToken: null }))
};

export default {
    signin,
};
