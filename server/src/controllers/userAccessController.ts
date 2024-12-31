import { Request, Response } from 'express';
import { query, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import AuthenticationFailedError from '~/errors/authenticationFailedError';
import BadRequestError from '~/errors/badRequestError';
import EstablishmentMissingError from '~/errors/establishmentMissingError';
import SignupLinkExpiredError from '~/errors/signupLinkExpiredError';
import SignupLinkMissingError from '~/errors/signupLinkMissingError';
import UserMissingError from '~/errors/userMissingError';
import { hasExpired } from '~/models/SignupLinkApi';
import establishmentRepository from '~/repositories/establishmentRepository';
import signupLinkRepository from '~/repositories/signupLinkRepository';
import ceremaService from '~/services/ceremaService';

async function get(request: Request, response: Response) {
  const { email } = request.query;

  if (typeof email === 'string') {

    // Verify that the person making the request is indeed the one whose rights are being checked
    const link = await signupLinkRepository.getByEmail(email);
    if (!link) {
      throw new SignupLinkMissingError(email);
    }
    if (hasExpired(link)) {
      throw new SignupLinkExpiredError();
    }

    // Browse through the list of Cerema users to find the one who has the open rights
    const ceremaUsers = await ceremaService.consultUsers(email);
    if(ceremaUsers.length === 0) {
      throw new UserMissingError(email);
    }
    let user = null;
    if(ceremaUsers.length === 1) {
      user = ceremaUsers[0];
    }
    if(ceremaUsers.length > 1) {
        user = ceremaUsers.filter((user) => user.hasCommitment)[0];
        if(!user) {
          throw new AuthenticationFailedError();
        }
    }

    if(user !== null) {
      // Check if the establishment exists
      const establishment = await establishmentRepository.findOne({siren: Number(user.establishmentSiren)});
      if (establishment) {
        user.establishmentId = establishment.id;
      } else {
        throw new EstablishmentMissingError(user.establishmentSiren);
      }
      response.status(constants.HTTP_STATUS_OK).json(user);
    }

  } else {
    throw new BadRequestError();
  }
}

const getValidators: ValidationChain[] = [query('email').isEmail().notEmpty()];

const userAccessController = {
  get,
  getValidators
};

export default userAccessController;
