import { SIGNUP_LINK_EXPIRATION, SIGNUP_LINK_LENGTH, SignupLinkApi, getAccountActivationLink } from '../models/SignupLinkApi';
import db from '../infra/database';
import signupLinkRepository from '../repositories/signupLinkRepository';
import { addHours, format } from 'date-fns';
import randomstring from 'randomstring';
import userRepository from '../repositories/userRepository';
import ceremaService from '../services/ceremaService';
import mailService from '../services/mailService';
import config from '../infra/config';
import { logger } from '../infra/logger';
import async from 'async';
import { CeremaDossier } from '../services/ceremaService/consultDossiersLovacService';
import establishmentRepository from '~/repositories/establishmentRepository';
import { structureToEstablishment } from '../services/ceremaService/consultStructureService';
import { getLastScriptExecutionDate, logScriptExecution } from '~/infra/elastic';

const run = async (): Promise<void> => {
  if (config.app.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  let date = await getLastScriptExecutionDate("ceremaTask");
  if(date) {
    date = format(date, 'yyyy-MM-dd');
  }

  let dossiers: CeremaDossier[] = await ceremaService.consultDossiersLovac(config.cerema.forceInvite ? null :  date);

  if (config.cerema.inviteLimit >= 0) {
    dossiers = dossiers.slice(0, config.cerema.inviteLimit);
  }
  let count = 0;

  await async.forEach(dossiers, async (dossier) => {
    const user = await userRepository.getByEmail(dossier.email);
    if (user === null) {
      const structure = await ceremaService.consultStructure(dossier.establishmentId);
      const establishment = await db.raw(`select * from establishments where siren=${Number(structure.siret.substring(0, 9))}`);
      if(establishment.rows.length === 0) {
        const establishment = await structureToEstablishment(structure);
        if(establishment.kind === null) {
          logger.warn({
            message: "Establishment has no 'kind'",
            establishmentId: establishment.id,
            type: 'missing_kind',
            timestamp: new Date().toISOString()
          });
        }
        await establishmentRepository.save(establishment);
      }

      const link = await signupLinkRepository.getByEmail(dossier.email);
      if (link === null) {
        count++;

        const link: SignupLinkApi = {
          id: randomstring.generate({
            charset: 'alphanumeric',
            length: SIGNUP_LINK_LENGTH,
          }),
          prospectEmail: dossier.email,
          expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
        };

        await signupLinkRepository.insert(link);

        await mailService.sendAccountActivationEmailFromLovac(link.id, {
          recipients: [dossier.email],
        });

        mailService.emit('prospect:initialized', dossier.email, {
          link: getAccountActivationLink(link.id),
        });
      }
    }
  });

  const message = `${count} users invited from Cerema API (LOVAC users)`;
  logger.info(message);
  logScriptExecution("ceremaTask", "SUCCESS", message);
};

run()
  .catch((e) => {
    logger.error(e);
    logScriptExecution("ceremaTask", "ERROR", e);
  })
  .finally(() => db.destroy());
