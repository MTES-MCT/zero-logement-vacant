import { Request, Response } from 'express';
import config from '../utils/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const signin = async (request: Request, response: Response): Promise<Response> => {

    console.log('signin')

    const email = request.body.email;
    const password = request.body.password;

    return bcrypt.compare(password, config.auth.password).then(
      isPasswordValid => {
          if (email !== config.auth.email || !isPasswordValid) {
              return response.status(401).send({ accessToken: null });
          } else {
              return response.status(200).send({
                  email: email,
                  accessToken: jwt.sign({ email }, config.auth.secret, { expiresIn: 86400 })
              });
          }
      }
    );
};

export default {
    signin,
};
