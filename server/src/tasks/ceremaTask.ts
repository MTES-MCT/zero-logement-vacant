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
import { CeremaDossier } from '../services/ceremaService/consultDossiersLovacService';
import establishmentRepository from '~/repositories/establishmentRepository';
import establishmentLocalityRepository from '~/repositories/establishmentLocalityRepository';
import { Structure, structureToEstablishment } from '../services/ceremaService/consultStructureService';
import { getLastScriptExecutionDate, logScriptExecution } from '~/infra/elastic';
import { wait } from '@zerologementvacant/utils';
import { EstablishmentApi } from '~/models/EstablishmentApi';

const createEstablishment = async (establishment: EstablishmentApi[] | undefined, structure: Structure) => {
  if(establishment?.length === 0) {
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
    await establishmentLocalityRepository.updateLocalities(establishment);
  }
};

const sendLink = async(dossier: CeremaDossier) => {
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
};

const run = async (): Promise<void> => {
  if (config.app.isReviewApp) {
    logger.info('This is a review app. Skipping...');
    return;
  }

  const date = await getLastScriptExecutionDate("ceremaTask");

  if (config.cerema.forceInvite) {
    logger.info('Cerema force invite mode enabled');
  } else {
    logger.info(`Cerema invite 'dossiers' created after ${date}`);
  }

  const dossiers: CeremaDossier[] = await ceremaService.consultDossiersLovac(config.cerema.forceInvite ? null :  date);

  logger.info(`Cerema invite found ${dossiers.length} 'dossiers'`);
  if(config.cerema.inviteLimit >= 0) {
    logger.info(`Cerema invite limite set to ${config.cerema.inviteLimit}`);
  }

  let count = 0;
  for (const dossier of dossiers) {

    if (config.cerema.inviteLimit >= 0 && count >= config.cerema.inviteLimit) {
      break;
    }

    const user = await userRepository.getByEmail(dossier.email);

    if (user === null) {
      const link = await signupLinkRepository.getByEmail(dossier.email);
      if (link === null) {
        if(!config.cerema.dryMode) {
          const structure = await ceremaService.consultStructure(dossier.establishmentId);
          // Pausing requests to the Cerema API to prevent overloading...
          // average response time is 100ms
          await wait(300);

          const establishment = await establishmentRepository.find({
            sirens: [ Number(structure.siret.substring(0, 9)) ]
          });

          await createEstablishment(establishment, structure);

          if(!config.cerema.dryMode) {
            await sendLink(dossier);
          }
        }
        count++;
      }
    }
  }

  const message = !config.cerema.dryMode ? `${count} users invited from Cerema API (LOVAC users)` : `${count} users to be invited from Cerema API (LOVAC users)`;
  logger.info(message);
  logScriptExecution("ceremaTask", "SUCCESS", message);
};

run()
  .catch((e) => {
    logger.error(e);
    logScriptExecution("ceremaTask", "ERROR", e);
  })
  .finally(() => db.destroy());
