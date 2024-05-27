import { SIGNUP_LINK_EXPIRATION, SIGNUP_LINK_LENGTH, SignupLinkApi, getAccountActivationLink } from '../models/SignupLinkApi';
import db from '../infra/database';
import signupLinkRepository from '../repositories/signupLinkRepository';
import { addHours } from 'date-fns';
import randomstring from 'randomstring';
import userRepository from '../repositories/userRepository';
import ceremaService from '../services/ceremaService';
import mailService from '../services/mailService';
import config from '../infra/config';
import { logger } from '../infra/logger';
import async from 'async';

const run = async (): Promise<void> => {
  if (config.app.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  let emails: string[] = await ceremaService.consultDossiersLovac();

  if (config.cerema.inviteLimit >= 0) {
    emails = emails.slice(0, config.cerema.inviteLimit);
  }
  let count = 0;

  await async.forEach(emails, async (email) => {
    const user = await userRepository.getByEmail(email);
    if (user === null) {
      const link = await signupLinkRepository.getByEmail(email);
      if (link === null) {
        count++;

        const link: SignupLinkApi = {
          id: randomstring.generate({
            charset: 'alphanumeric',
            length: SIGNUP_LINK_LENGTH,
          }),
          prospectEmail: email,
          expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
        };

        await signupLinkRepository.insert(link);

        await mailService.sendAccountActivationEmail(link.id, {
          recipients: [email],
        });

        mailService.emit('prospect:initialized', email, {
          link: getAccountActivationLink(link.id),
        });
      }
    }
  });

  logger.info(`${count} users invited from Cerema API (LOVAC users)`);
}

run()
  .catch(logger.error)
  .finally(() => db.destroy());
