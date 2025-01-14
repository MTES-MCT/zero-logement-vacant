import db from '~/infra/database/';
import userRepository from '~/repositories/userRepository';
import { createLogger } from '~/infra/logger';
import ceremaService from '~/services/ceremaService';

const logger = createLogger('ceremaAccountTask');

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async function run(): Promise<void> {
  logger.info('Starting cerema account check...');
  const users = await userRepository.find({ filters: { disabled: false}});

  for (const user of users) {
    const ceremaUsers = await ceremaService.consultUsers(user.email);
    if(ceremaUsers.length === 0) {
      logger.warn(`No cerema user found for ${user.email}`);
      await userRepository.remove(user.id);
    } else if(ceremaUsers.length === 1) {
        if(!(ceremaUsers[0].isValid)) {
            logger.warn(`No cerema valid account found for ${user.email}`);
            user.disabled = true;
            await userRepository.update(user);
        } else {
          logger.info(`Cerema user found for ${user.email}`);
        }
    } else if(ceremaUsers.length > 1) {
        logger.info(`Multiple cerema users found for ${user.email}`);
        const ceremaUser = ceremaUsers.filter((user) => user.isValid)[0];
        if(!ceremaUser) {
            logger.warn(`No cerema valid account found for ${user.email}`);
            user.disabled = true;
            await userRepository.update(user);
        } else {
          logger.info(`Cerema user found for ${user.email}`);
        }
    }

    await delay(100);
  };
}

run().finally(() => db.destroy());
